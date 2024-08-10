export type TPublication ={
    title: string;
    journal: string;
    year: number;
    authors: string[]; 
    doi?: string; 
  }

export  type TFaculty ={
    _id: string; 
    name: string;
    designation: string; 
    department: string;
    roomNo:number;
    email: string;
    phone?: string; 
    researchInterests?: string[]; 
    coursesTaught?: string[]; 
    publications?: TPublication[]; 
  }