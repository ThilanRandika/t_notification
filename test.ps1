$headers = @{"Content-Type" = "application/json"}

$body1 = @{email="user@example.com"; name="John Doe"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3004/api/notifications/welcome" -Method POST -Headers $headers -Body $body1

$body2 = @{
    orderId = "12345"
    userEmail = "user@example.com"
    totalAmount = 15000
    items = @( @{productName="Luxury Silk Pillowcase"; quantity=2; price=7500} )
    shippingAddress = @{street="123 Silk Rd"; city="Colombo"; country="LK"}
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://localhost:3004/api/notifications/order-placed" -Method POST -Headers $headers -Body $body2

$body3 = @{
    orderId = "12345"
    userEmail = "user@example.com"
    status = "shipped"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3004/api/notifications/order-status" -Method POST -Headers $headers -Body $body3
