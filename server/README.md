# Backend Server for PayHero Integration

## Setup Instructions

### 1. Install Dependencies

```bash
npm install express cors dotenv
npm install --save-dev nodemon
```

### 2. Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
NODE_ENV=development

# PayHero Credentials
PAYHERO_API_KEY=6CUxNcfi9jRpr4eWicAn
PAYHERO_API_SECRET=j6zP2XpAlXn9UhtHOj9PbYQVAdlQnkeyrEWuFOAH
PAYHERO_ACCOUNT_ID=3398

# Callback URL (where PayHero sends payment results)
CALLBACK_URL=https://yourdomain.com

# Database (Supabase or other)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 3. Database Tables

Create these tables in your database:

#### Payments Table
```sql
CREATE TABLE payments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  external_reference VARCHAR(50) NOT NULL UNIQUE,
  checkout_request_id VARCHAR(100),
  mpesa_receipt_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'PENDING',
  result_code INT,
  result_desc TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INT NOT NULL,
  type VARCHAR(20),
  amount DECIMAL(10, 2),
  status VARCHAR(20),
  mpesa_receipt VARCHAR(50),
  external_reference VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Run the Server

```bash
npm run dev
```

Server will run on `http://localhost:5000`

## API Endpoints

### Initiate Payment
**POST** `/api/payments/initiate`

Request:
```json
{
  "amount": 1000,
  "phoneNumber": "254712345678",
  "userId": 123
}
```

Response:
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "externalReference": "DEP-1708456789-123",
    "checkoutRequestId": "ws_CO_DMZ...",
    "amount": 1000,
    "phone": "254712345678"
  }
}
```

### Check Payment Status
**GET** `/api/payments/status/:externalReference`

Response:
```json
{
  "success": true,
  "payment": {
    "id": 1,
    "user_id": 123,
    "amount": 1000,
    "status": "Success",
    "mpesa_receipt_number": "SAP12345",
    "created_at": "2026-02-21T20:00:00Z"
  }
}
```

## Integration with React

Update the Finance component to use these endpoints:

```javascript
// In Finance.tsx
const handleTransaction = async () => {
  try {
    setIsProcessing(true);
    
    // Call backend API
    const response = await fetch('http://localhost:5000/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseInt(amount),
        phoneNumber: mpesaNumber,
        userId: user.id
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Show loading message
      alert('STK push sent to ' + mpesaNumber);
      
      // Poll for payment status
      const checkStatus = setInterval(async () => {
        const statusRes = await fetch(
          `http://localhost:5000/api/payments/status/${data.data.externalReference}`
        );
        const statusData = await statusRes.json();
        
        if (statusData.payment.status === 'Success') {
          clearInterval(checkStatus);
          deposit(parseInt(amount));
          alert('Payment successful!');
        }
      }, 3000);
      
      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(checkStatus), 300000);
    } else {
      alert('Payment initiation failed: ' + data.message);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    setIsProcessing(false);
  }
};
```

## Deployment Notes

1. Update `CALLBACK_URL` to your production domain
2. Update CORS origin to allow only your frontend domain
3. Use environment variables for all sensitive data
4. Enable HTTPS for all API calls
5. Set up proper error logging
6. Test with PayHero sandbox endpoints first (if available)

## Troubleshooting

- **Phone format issues**: Check normalizePhoneNumber function
- **Auth failures**: Verify API key and secret
- **Callbacks not received**: Check callback URL and firewall rules
- **Database errors**: Check table schemas and permissions
