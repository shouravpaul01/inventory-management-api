import { emailQueue } from "./email.queue";

export interface ISendEmailQueuePayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Pushes an email job to the BullMQ background queue for asynchronous processing.
 */
export const sendEmailViaQueue = async (payload: ISendEmailQueuePayload) => {
  return emailQueue.add("sendEmailJob", payload);
};

export const EmailQueueService = {
  sendEmailViaQueue,
};
