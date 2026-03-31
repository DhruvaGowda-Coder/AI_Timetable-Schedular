import * as XLSX from "xlsx-js-style";
import { z } from "zod";
import { SchedulerConstraints } from "@/lib/types";

// Zod schemas for row validation
const SubjectRowSchema = z.object({
    Name: z.string().min(1),
    "Weekly Hours": z.number().min(1).max(20), // Reasonable max
});

const FacultyRowSchema = z.object({
    Name: z.string().min(1),
    "Can Teach": z.string().min(1), // Comma separated list
});

const RoomRowSchema = z.object({
    Name: z.string().min(1),
    Capacity: z.number().min(1),
});

export async function parseSchedulerExcel(buffer: ArrayBuffer): Promise<Partial<SchedulerConstraints>> {
    const workbook = XLSX.read(buffer, { type: "array" });

    const subjects: Array<{ name: string; weeklyHours: number }> = [];
    const faculties: Array<{ name: string; canTeach: string[] }> = [];
    const rooms: Array<{ name: string; capacity: number }> = [];

    // Helper to get data from a sheet (case-insensitive header matching would be ideal, but strict for now)
    const getSheetData = (sheetName: string): Record<string, unknown>[] => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return [];
        return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    };

    // 1. Parse Subjects
    // Look for a sheet named "Subjects" or just check the first sheet if specific ones aren't found?
    // Let's enforce specific sheet names for the "Template" structure.

    const subjectData = getSheetData("Subjects");
    subjectData.forEach((row) => {
        const parsed = SubjectRowSchema.safeParse(row);
        if (parsed.success) {
            subjects.push({
                name: parsed.data.Name,
                weeklyHours: parsed.data["Weekly Hours"],
            });
        }
    });

    // 2. Parse Faculty
    const facultyData = getSheetData("Faculty");
    facultyData.forEach((row) => {
        const parsed = FacultyRowSchema.safeParse(row);
        if (parsed.success) {
            faculties.push({
                name: parsed.data.Name,
                canTeach: parsed.data["Can Teach"].split(",").map((s) => s.trim()).filter(Boolean),
            });
        }
    });

    // 3. Parse Rooms
    const roomData = getSheetData("Rooms");
    roomData.forEach((row) => {
        const parsed = RoomRowSchema.safeParse(row);
        if (parsed.success) {
            rooms.push({
                name: parsed.data.Name,
                capacity: parsed.data.Capacity,
            });
        }
    });

    // Return partial constraints. We don't overwrite slot timings or days unless specified, 
    // but for now let's just import the "Entities".
    return {
        subjects,
        faculties,
        rooms,
    };
}


