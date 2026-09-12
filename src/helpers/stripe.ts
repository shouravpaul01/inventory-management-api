import Stripe from "stripe";
import { env } from "../config/env.config";

const stripe = new Stripe(((env as any).STRIPE_SECRET_KEY as string) || "mock_key");

export default stripe;
