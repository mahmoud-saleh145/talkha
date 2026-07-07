export const SECONDARY_GRADES = [
    "أولى ثانوي",
    "تانية ثانوي",
    "تالتة ثانوي",
] as const;

export const NON_SECONDARY_GRADES = [
    "3 ابتدائي",
    "4 ابتدائي",
    "5 ابتدائي",
    "6 ابتدائي",
    "أولى إعدادي",
    "تانية إعدادي",
    "تالتة إعدادي",
] as const;

export const ALL_GRADES = [
    ...NON_SECONDARY_GRADES,
    ...SECONDARY_GRADES,
] as const;

export type Grade = (typeof ALL_GRADES)[number];

export const SECONDARY_2_TRACKS = [
    "مسار الطب و علوم الحياة",
    "مسار الهندسة و علوم الحاسب",
    "مسار الأعمال",
    "مسار الأدب و الفنون",
] as const;

export const SECONDARY_3_TRACKS = [
    "علمي رياضة",
    "علمي علوم",
    "أدبي",
] as const;

export const GRADES_WITH_TRACK = [
    "تانية ثانوي",
    "تالتة ثانوي",
] as const;