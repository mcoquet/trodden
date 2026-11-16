import { charge } from "./payment-client.js";

const orders = new Map();
let nextId = 1;

export async function createOrder({ customerId, amount, cardToken }) {
  if (!customerId || !(amount > 0) || !cardToken) {
    throw new Error("invalid order");
  }
  const id = String(nextId++);
  const payment = await charge({ orderId: id, amount, cardToken });
  const order = { id, customerId, amount, paymentId: payment.id, status: "paid" };
  orders.set(id, order);
  console.log("created order " + id + " for customer " + customerId);
  return order;
}

export function getOrder(id) {
  return orders.get(id);
}
