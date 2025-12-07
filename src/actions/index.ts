import type { ActionAPIContext } from "astro:actions";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { db, eq, and, JobPosts, JobSkills } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createJobPost: defineAction({
    input: z.object({
      id: z.string().optional(),
      title: z.string().min(1, "Title is required"),
      companyName: z.string().optional(),
      location: z.string().optional(),
      sourceType: z.string().optional(),
      sourceUrl: z.string().optional(),
      rawText: z.string().min(1, "Job description is required"),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [post] = await db
        .insert(JobPosts)
        .values({
          id: input.id ?? crypto.randomUUID(),
          userId: user.id,
          title: input.title,
          companyName: input.companyName,
          location: input.location,
          sourceType: input.sourceType,
          sourceUrl: input.sourceUrl,
          rawText: input.rawText,
          createdAt: new Date(),
        })
        .returning();

      return { post };
    },
  }),

  updateJobPost: defineAction({
    input: z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      companyName: z.string().optional(),
      location: z.string().optional(),
      sourceType: z.string().optional(),
      sourceUrl: z.string().optional(),
      rawText: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, ...rest } = input;

      const [existing] = await db
        .select()
        .from(JobPosts)
        .where(and(eq(JobPosts.id, id), eq(JobPosts.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Job post not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { post: existing };
      }

      const [post] = await db
        .update(JobPosts)
        .set(updateData)
        .where(and(eq(JobPosts.id, id), eq(JobPosts.userId, user.id)))
        .returning();

      return { post };
    },
  }),

  listJobPosts: defineAction({
    input: z.object({}).optional(),
    handler: async (_, context) => {
      const user = requireUser(context);

      const posts = await db.select().from(JobPosts).where(eq(JobPosts.userId, user.id));

      return { posts };
    },
  }),

  deleteJobPost: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [deleted] = await db
        .delete(JobPosts)
        .where(and(eq(JobPosts.id, input.id), eq(JobPosts.userId, user.id)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Job post not found.",
        });
      }

      return { post: deleted };
    },
  }),

  saveSkill: defineAction({
    input: z.object({
      id: z.string().optional(),
      jobPostId: z.string(),
      name: z.string().min(1, "Skill name is required"),
      category: z.string().optional(),
      importance: z.number().int().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [post] = await db
        .select()
        .from(JobPosts)
        .where(and(eq(JobPosts.id, input.jobPostId), eq(JobPosts.userId, user.id)))
        .limit(1);

      if (!post) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Job post not found.",
        });
      }

      const baseValues = {
        jobPostId: input.jobPostId,
        name: input.name,
        category: input.category,
        importance: input.importance,
        createdAt: new Date(),
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(JobSkills)
          .where(eq(JobSkills.id, input.id))
          .limit(1);

        if (!existing || existing.jobPostId !== input.jobPostId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Job skill not found.",
          });
        }

        const [skill] = await db
          .update(JobSkills)
          .set(baseValues)
          .where(eq(JobSkills.id, input.id))
          .returning();

        return { skill };
      }

      const [skill] = await db.insert(JobSkills).values(baseValues).returning();
      return { skill };
    },
  }),

  deleteSkill: defineAction({
    input: z.object({
      id: z.string(),
      jobPostId: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [post] = await db
        .select()
        .from(JobPosts)
        .where(and(eq(JobPosts.id, input.jobPostId), eq(JobPosts.userId, user.id)))
        .limit(1);

      if (!post) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Job post not found.",
        });
      }

      const [deleted] = await db
        .delete(JobSkills)
        .where(and(eq(JobSkills.id, input.id), eq(JobSkills.jobPostId, input.jobPostId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Job skill not found.",
        });
      }

      return { skill: deleted };
    },
  }),
};
