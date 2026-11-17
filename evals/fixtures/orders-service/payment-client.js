const PAYMENT_URL = "https://payments.example.com/v1/charges";
const PAYMENT_API_KEY = "test-key-123";

export async function charge({ orderId, amount, cardToken }) {
  const response = await fetch(PAYMENT_URL, {
    method: "POST",
    headers: {
      authorization: "Bearer " + PAYMENT_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ orderId, amount, cardToken }),
  });
  if (!response.ok) {
    throw new Error("payment failed with status " + response.status);
  }
  return response.json();
}
