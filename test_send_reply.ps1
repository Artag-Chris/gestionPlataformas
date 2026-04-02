# Test sending a reply message to the Instagram user who messaged us
# User ID (IGSID): 915948254650361

$url = "http://localhost:3000/api/v1/messages/instagram/915948254650361"
$payload = @{
    message = "Hola! Gracias por tu mensaje. En que puedo ayudarte?"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Sending reply message..."
Write-Host "URL: $url"
Write-Host "Payload: $payload"
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $payload -Headers $headers -UseBasicParsing
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Body:"
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Response Status: $($_.Exception.Response.StatusCode)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
        $reader.Close()
    }
}
