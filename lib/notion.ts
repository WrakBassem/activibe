import "server-only";

import { Client } from "@notionhq/client";

export const notionKey = (process.env.NOTION_KEY || "").trim();
export const notionClient = new Client({ auth: notionKey });

export const getDatabase = async (id: string, property: "date" | "axis" | "Q1" | "Q2" | "Q3" | "Q4" | "total" | "system_version" | "source", direction: "asc" | "desc") => {
    if (!notionKey || !id) {
        throw new Error("NOTION_KEY or NOTION_DATABASE_ID is not defined");
    }
    
    // Using dataSources.query as databases.query is removed in API 2025-09-03
    const response = await notionClient.dataSources.query({
        data_source_id: id,
        sorts: [
            {
                property: property,
                direction: direction === "asc" ? "ascending" : "descending",
            },
        ],
    });
    
    return response;
}   
export const fetchDatabase = async () => {
    let databaseId = (process.env.NOTION_DATABASE_ID || "").trim();
    
    // Helper to ensure UUID has hyphens (copied from route.ts for consistency)
    if (databaseId && !databaseId.includes("-") && databaseId.length === 32) {
        databaseId = `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`;
    }
    
    const query = await getDatabase(databaseId, "date", "desc");
    return query.results;
}