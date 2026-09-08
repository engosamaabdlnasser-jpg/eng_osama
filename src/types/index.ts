export type Category={id:string;name:string;created_at?:string};
export type Lesson={id:string;course_id:string;title:string;description:string;youtube_url:string;sort_order:number;created_at?:string};
export type Course={id:string;title:string;description:string;image_url:string|null;category_id:string|null;instructor_name:string;published:boolean;created_at?:string;category?:Category;lessons?:Lesson[]};
export type Profile={id:string;full_name:string|null;role:'student'|'admin';created_at?:string};
