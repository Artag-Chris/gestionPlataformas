# Script to send Slack webhook test event with proper HMAC signature
$SlackSigningSecret = "e0d400bb387dcc0ba2480ee193f58442"
$GatewayUrl = "http://localhost:3000/api/webhooks/slack"
# Get current timestamp in UTC
$Timestamp = [int](([datetime]::UtcNow - [datetime]"1970-01-01T00:00:00Z").TotalSeconds)

# Create payload
$payload = @{
    token = "verification_token"
    team_id = "T06C5E4Q70E"
    api_app_id = "A06CJ4KN9V2"
    event = @{
        type = "message"
        channel = "C06CJFJ3TCM"
        user = "U06CJ37D9U5"
        text = "Test message for bot integration"
        ts = $Timestamp.ToString()
        event_ts = $Timestamp.ToString()
    }
    type = "event_callback"
    event_id = "Ev$Timestamp"
    event_time = $Timestamp
} | ConvertTo-Json -Compress

# Calculate signature
$secret_bytes = [System.Text.Encoding]::UTF8.GetBytes($SlackSigningSecret)
$signed_content = "v0:$($Timestamp):$($payload)"
$hmac = New-Object System.Security.Cryptography.HMACSHA256 -ArgumentList @(,$secret_bytes)
$hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signed_content))
$signature = "v0=" + (($hash | ForEach-Object { $_.ToString("x2") }) -join "")

Write-Host "Timestamp: $Timestamp"
Write-Host "Signature: $signature"
Write-Host "Payload:`n$payload"

# Send request
$headers = @{
    "Content-Type" = "application/json"
    "X-Slack-Request-Timestamp" = $Timestamp.ToString()
    "X-Slack-Signature" = $signature
}

Write-Host "`nSending request to $GatewayUrl..."
try {
    $response = Invoke-WebRequest -Uri $GatewayUrl -Method POST -Headers $headers -Body $payload -UseBasicParsing
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Body: $($response.Content)"
} catch {
    Write-Host "Error: $_"
    Write-Host "Response: $($_.Exception.Response)"
}
