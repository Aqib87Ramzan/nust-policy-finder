export interface HandbookChunk {
  id: number;
  text: string;
  source: string;
  chapter: string;
  section: string;
  page: number;
}

export const handbookChunks: HandbookChunk[] = [
  {
    id: 1,
    text: "75% attendance is a must for a student to be allowed to appear in the End Semester Examination of a subject. Students shall be awarded XF grade if their respective attendance falls below 75%. No deviation from this rule is allowed under any circumstances.",
    source: "UG Handbook",
    chapter: "Chapter 2",
    section: "Attendance Policy",
    page: 11,
  },
  {
    id: 2,
    text: "The minimum Cumulative Grade Point Average (CGPA) required for the award of an Undergraduate degree is 2.00. Students failing to achieve this minimum CGPA shall not be awarded a degree and may be required to repeat courses to improve their CGPA.",
    source: "UG Handbook",
    chapter: "Chapter 3",
    section: "Minimum CGPA for UG Degree",
    page: 15,
  },
  {
    id: 3,
    text: "The minimum Cumulative Grade Point Average (CGPA) required for the award of an MS degree is 3.00. Students must maintain a CGPA of at least 3.00 throughout their program. Failure to maintain this CGPA may result in probation or dismissal from the program.",
    source: "PG Handbook",
    chapter: "Chapter 4",
    section: "Minimum CGPA for MS Degree",
    page: 22,
  },
  {
    id: 4,
    text: "The minimum Cumulative Grade Point Average (CGPA) required for the award of a PhD degree is 3.50. PhD students must maintain a minimum CGPA of 3.50 throughout the duration of their program to remain in good academic standing.",
    source: "PG Handbook",
    chapter: "Chapter 4",
    section: "Minimum CGPA for PhD Degree",
    page: 24,
  },
  {
    id: 5,
    text: "A student who obtains an F grade in a course is required to repeat that course when it is next offered. The F grade remains on the transcript but is excluded from CGPA calculation once the course is successfully repeated. Students must register for the repeated course at the earliest opportunity.",
    source: "UG Handbook",
    chapter: "Chapter 5",
    section: "Failure and Course Repetition",
    page: 28,
  },
  {
    id: 6,
    text: "A student may repeat a course to improve their grade. The higher grade obtained shall replace the previous grade in CGPA calculation. However, both attempts shall remain on the transcript. A course can be repeated a maximum of two times.",
    source: "UG Handbook",
    chapter: "Chapter 5",
    section: "Course Repetition Policy",
    page: 30,
  },
  {
    id: 7,
    text: "A student who accumulates 7 or more F and/or XF grades during their entire program of study shall be withdrawn from the university. This withdrawal is permanent and the student shall not be eligible for re-admission to the same program.",
    source: "UG Handbook",
    chapter: "Chapter 6",
    section: "Withdrawal Conditions",
    page: 33,
  },
  {
    id: 8,
    text: "A student shall be placed on academic probation if their semester GPA falls below 2.00 in any given semester. Students on probation are required to achieve a minimum semester GPA of 2.00 in the immediately following semester to be removed from probation. Failure to do so may result in further academic consequences.",
    source: "UG Handbook",
    chapter: "Chapter 6",
    section: "Probation Policy",
    page: 35,
  },
  {
    id: 9,
    text: "Students may add or drop courses during the first two weeks of a regular semester without any academic or financial penalty. After the two-week period, courses can only be dropped with a W grade on the transcript. No course additions are allowed after the first two weeks.",
    source: "UG Handbook",
    chapter: "Chapter 7",
    section: "Adding and Dropping Courses",
    page: 38,
  },
  {
    id: 10,
    text: "A W (Withdrawal) grade is assigned when a student officially withdraws from a course after the add/drop period but before the deadline specified in the academic calendar. The W grade has no effect on GPA calculation and is simply recorded on the transcript as a withdrawal.",
    source: "UG Handbook",
    chapter: "Chapter 7",
    section: "W Grade Policy",
    page: 40,
  },
  {
    id: 11,
    text: "The GPA grading scale at NUST is as follows: A = 4.00, A- = 3.67, B+ = 3.33, B = 3.00, B- = 2.67, C+ = 2.33, C = 2.00, C- = 1.67, D+ = 1.33, D = 1.00, F = 0.00. The minimum passing grade for undergraduate courses is D.",
    source: "UG Handbook",
    chapter: "Chapter 3",
    section: "GPA Grading Scale",
    page: 16,
  },
  {
    id: 12,
    text: "An undergraduate student must register for a minimum of 12 credit hours and a maximum of 18 credit hours per regular semester. Students on the Dean's Honor List may be allowed to register for up to 21 credit hours with the approval of the Head of Department.",
    source: "UG Handbook",
    chapter: "Chapter 8",
    section: "Credit Hour Limits",
    page: 42,
  },
  {
    id: 13,
    text: "Summer semester is an optional semester of 8 weeks duration. Students may register for a maximum of two courses or 6 credit hours during a summer semester. The same attendance and examination rules apply as in a regular semester. Summer semester courses carry the same weight in CGPA calculation.",
    source: "UG Handbook",
    chapter: "Chapter 8",
    section: "Summer Semester Rules",
    page: 44,
  },
  {
    id: 14,
    text: "A student may apply for deferment of semester due to medical reasons, personal emergencies, or other genuine grounds approved by the competent authority. Deferment applications must be submitted within the first four weeks of the semester. A maximum of two semesters can be deferred during the entire program of study.",
    source: "UG Handbook",
    chapter: "Chapter 9",
    section: "Deferment of Semester",
    page: 47,
  },
  {
    id: 15,
    text: "PhD students must pass a Qualifying Examination with a minimum score of 65%. The exam consists of Part A (written) and Part B (oral defense). Part A covers core subjects in the student's field of study, while Part B is an oral presentation and defense before a committee. Both parts must be passed independently. Students are allowed a maximum of two attempts.",
    source: "PG Handbook",
    chapter: "Chapter 10",
    section: "PhD Qualifying Examination",
    page: 55,
  },
];
