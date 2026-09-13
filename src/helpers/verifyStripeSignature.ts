import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { env } from "../config/env.config";

const stripe = new Stripe(((env as any).STRIPE_SECRET_KEY as string) || "mock_key");

export const verifyStripeSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    return res.status(400).send("Missing Stripe signature");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      ((env as any).STRIPE_WEBHOOK_SECRET as string) || "mock_secret"
    );

    (req as any).stripeEvent = event;
    next();
  } catch (err: any) {
    console.error("Stripe signature verification failed:", err.message);
    next(err);
  }
};
