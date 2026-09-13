import prisma from "../shared/prisma";
import ApiError from "../errors/ApiErrors";
import httpStatus from "http-status";

/**
 * Concurrency-safe unique code generator using MongoDB atomic $inc via Prisma.
 */
export const generateSequentialCode = async (
  sequenceCode: string,
  fallbackPrefix = "GEN"
): Promise<string> => {
  let seq = await prisma.codeSequence.findUnique({
    where: { code: sequenceCode },
  });

  if (!seq) {
    // Create sequence if not present
    seq = await prisma.codeSequence.create({
      data: {
        code: sequenceCode,
        name: `${fallbackPrefix} Sequence`,
        prefix: fallbackPrefix,
        separator: "-",
        currentNumber: 0,
        startNumber: 1,
        paddingLength: 6,
        yearIncluded: false,
        isActive: true,
      },
    });
  }

  if (!seq.isActive) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Code sequence '${sequenceCode}' is currently inactive.`
    );
  }

  // Atomic increment - concurrency safe in MongoDB ($inc)
  const updatedSeq = await prisma.codeSequence.update({
    where: { code: sequenceCode },
    data: {
      currentNumber: { increment: 1 },
    },
  });

  const now = new Date();
  const parts: string[] = [updatedSeq.prefix];

  if (updatedSeq.yearIncluded) {
    parts.push(now.getFullYear().toString());
  }

  if (updatedSeq.monthIncluded) {
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    parts.push(month);
  }

  const paddedNumber = updatedSeq.currentNumber
    .toString()
    .padStart(updatedSeq.paddingLength, "0");
  parts.push(paddedNumber);

  return parts.join(updatedSeq.separator);
};
