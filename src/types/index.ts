export type Category={id:string;name:string;created_at?:string};
export type Lesson={id:string;course_id:string;title:string;description:string;youtube_url:string;sort_order:number;created_at?:string};
export type Course={id:string;title:string;description:string;image_url:string|null;category_id:string|null;instructor_name:string;published:boolean;created_at?:string;category?:Category;lessons?:Lesson[]};
export type Profile={id:string;full_name:string|null;role:'student'|'admin';created_at?:string};
export type HomeExtraSection={enabled:boolean;title:string;description:string;button_label:string;button_url:string};
export type SiteSettings={brand_name:string;logo_url:string;hero_badge:string;hero_title:string;hero_description:string;primary_cta_label:string;secondary_cta_label:string;featured_title:string;featured_description:string;categories_title:string;categories_description:string;footer_text:string;announcement:string;show_categories:boolean;show_featured:boolean;extra_sections:HomeExtraSection[]};
export type StudentMonitorRow={user_id:string;full_name:string|null;role:'student'|'admin';created_at:string;completed_lessons:number;last_completed_at:string|null;started_courses:number;completion_percent:number};
