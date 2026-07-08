"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createFeatureRequest(data: { 
  title: string; 
  description: string;
  category?: string;
  imageUrl?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const { title, description, category, imageUrl } = data;

  if (!title || !description) {
    throw new Error("Title and description are required");
  }

  const featureRequest = await prisma.featureRequest.create({
    data: {
      userId: session.user.id,
      title,
      description,
      category,
      imageUrl,
    },
  });

  revalidatePath("/feature-requests");
  return { success: true, featureRequest };
}

export async function getFeatureRequests({
  page = 1,
  limit = 20,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
} = {}) {
  const session = await auth();

  // Allow all logged-in users to see feature requests
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const skip = (page - 1) * limit;
  const where: any = {
    mergedIntoId: null, // Only show primary requests, not merged duplicates
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [requests, total] = await Promise.all([
    prisma.featureRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            comments: true,
            upvotes: true,
            mergedRequests: true,
          },
        },
        upvotes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    }),
    prisma.featureRequest.count({ where }),
  ]);

  return { requests, total };
}

export async function getFeatureRequestById(id: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const request = await prisma.featureRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
      _count: {
        select: {
          upvotes: true,
          mergedRequests: true,
        },
      },
      upvotes: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
      },
    },
  });

  return request;
}

export async function addComment(featureRequestId: string, content: string, imageUrl?: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const comment = await prisma.featureRequestComment.create({
    data: {
      userId: session.user.id,
      featureRequestId,
      content,
      imageUrl,
    },
  });

  revalidatePath(`/feature-requests/${featureRequestId}`);
  return { success: true, comment };
}

export async function toggleUpvote(featureRequestId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const existing = await prisma.featureRequestUpvote.findUnique({
    where: {
      featureRequestId_userId: {
        featureRequestId,
        userId: session.user.id,
      },
    },
  });

  if (existing) {
    await prisma.featureRequestUpvote.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.featureRequestUpvote.create({
      data: {
        featureRequestId,
        userId: session.user.id,
      },
    });
  }

  revalidatePath("/feature-requests");
  revalidatePath(`/feature-requests/${featureRequestId}`);
  return { success: true, upvoted: !existing };
}

export async function updateFeatureRequestStatus(id: string, status: string) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized. Super Admin only.");
  }

  const updated = await prisma.featureRequest.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/feature-requests");
  revalidatePath(`/feature-requests/${id}`);
  return { success: true, updated };
}

export async function mergeFeatureRequest(sourceId: string, targetId: string) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized. Super Admin only.");
  }

  if (sourceId === targetId) {
    throw new Error("Cannot merge into itself");
  }

  await prisma.featureRequest.update({
    where: { id: sourceId },
    data: { 
      mergedIntoId: targetId,
      status: "Closed" 
    },
  });

  revalidatePath("/feature-requests");
  revalidatePath(`/feature-requests/${sourceId}`);
  revalidatePath(`/feature-requests/${targetId}`);
  return { success: true };
}
