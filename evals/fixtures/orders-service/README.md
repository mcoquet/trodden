# orders-service

A small HTTP service that takes orders and charges the customer through a payment provider.

- `POST /orders` with `{ "customerId", "amount", "cardToken" }` creates an order.
- `GET /orders/<id>` returns one.

Run it with `npm start`. It has no dependencies.
