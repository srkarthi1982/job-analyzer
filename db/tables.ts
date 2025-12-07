import { defineTable, column, NOW } from "astro:db";

export const JobPosts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    title: column.text(),
    companyName: column.text({ optional: true }),
    location: column.text({ optional: true }),
    sourceType: column.text({ optional: true }),
    sourceUrl: column.text({ optional: true }),
    rawText: column.text(),
    createdAt: column.date({ default: NOW }),
  },
});

export const JobSkills = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    jobPostId: column.text({
      references: () => JobPosts.columns.id,
    }),
    name: column.text(),
    category: column.text({ optional: true }),
    importance: column.number({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  JobPosts,
  JobSkills,
} as const;
