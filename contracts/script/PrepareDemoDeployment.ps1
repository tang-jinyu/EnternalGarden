param(
    [string]$RpcUrl = "https://testnet-rpc.monad.xyz",
    [uint64]$InactivityWindowSeconds = 90
)

$ErrorActionPreference = "Stop"
$contractsRoot = Split-Path -Parent $PSScriptRoot
$forgePath = Join-Path $contractsRoot "node_modules\.bin\forge.cmd"
$castPath = Join-Path $contractsRoot "node_modules\.bin\cast.cmd"
$createX = "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed"
$salt = "0x0000000000000000000000000000000000000000000000000000000000000000"

if (-not (Test-Path -LiteralPath $forgePath)) {
    throw "Local Forge binary not found. Run npm install in contracts/."
}
if (-not (Test-Path -LiteralPath $castPath)) {
    throw "Local Cast binary not found. Run npm install in contracts/."
}

Push-Location $contractsRoot
try {
    & $forgePath build | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "forge build failed" }

    $factoryCode = & $castPath code $createX --rpc-url $RpcUrl
    if ($factoryCode -eq "0x") { throw "CreateX has no code on the selected network" }

    $creationCode = & $forgePath inspect "src/EternalGarden.sol:EternalGarden" bytecode
    $encodedArgs = & $castPath abi-encode "constructor(uint64)" $InactivityWindowSeconds
    $initCode = $creationCode + $encodedArgs.Substring(2)
    $initCodeHash = & $castPath keccak $initCode
    $predictedAddress = & $castPath call $createX `
        "computeCreate2Address(bytes32,bytes32)(address)" `
        $salt $initCodeHash --rpc-url $RpcUrl
    $existingCode = & $castPath code $predictedAddress --rpc-url $RpcUrl

    [pscustomobject]@{
        rpcUrl = $RpcUrl
        createX = $createX
        createXCodeBytes = ($factoryCode.Length - 2) / 2
        inactivityWindowSeconds = $InactivityWindowSeconds
        salt = $salt
        creationCodeBytes = ($creationCode.Length - 2) / 2
        initCodeBytes = ($initCode.Length - 2) / 2
        initCodeHash = $initCodeHash
        predictedAddress = $predictedAddress
        predictedAddressHasCode = $existingCode -ne "0x"
        initCode = $initCode
    } | ConvertTo-Json -Depth 3
}
finally {
    Pop-Location
}
