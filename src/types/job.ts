export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string | null;
  type: string | null;
  remote: boolean;
  url: string;
  source: string;
  postedDate: string | null;
  companyLogo: string | null;
  via: string | null;
  benefits: string[];
  qualifications: string[];
}

export interface SearchParams {
  keyword: string;
  location: string;
  type: string;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  page: number;
  resultsPerPage: number;
  sources: string[];
}

export interface SourceStatus {
  name: string;
  count: number;
  error: string | null;
  available: boolean;
}

export interface SearchResponse {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sources: SourceStatus[];
}

export const US_CITIES = [
  'All US',
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Charlotte, NC',
  'Indianapolis, IN',
  'San Francisco, CA',
  'Seattle, WA',
  'Denver, CO',
  'Washington, DC',
  'Nashville, TN',
  'Oklahoma City, OK',
  'El Paso, TX',
  'Boston, MA',
  'Portland, OR',
  'Las Vegas, NV',
  'Memphis, TN',
  'Louisville, KY',
  'Baltimore, MD',
  'Milwaukee, WI',
  'Albuquerque, NM',
  'Tucson, AZ',
  'Fresno, CA',
  'Sacramento, CA',
  'Mesa, AZ',
  'Kansas City, MO',
  'Atlanta, GA',
  'Omaha, NE',
  'Raleigh, NC',
  'Miami, FL',
  'Minneapolis, MN',
  'Tampa, FL',
  'New Orleans, LA',
  'Cleveland, OH',
  'Pittsburgh, PA',
  'Cincinnati, OH',
  'St. Louis, MO',
  'Orlando, FL',
  'Remote',
];

export const JOB_POSITIONS = [
  'All Positions',
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Data Analyst',
  'Data Engineer',
  'Machine Learning Engineer',
  'AI Engineer',
  'Cloud Engineer',
  'Site Reliability Engineer',
  'QA Engineer',
  'Security Engineer',
  'Product Manager',
  'Project Manager',
  'Scrum Master',
  'UX Designer',
  'UI Designer',
  'Graphic Designer',
  'Business Analyst',
  'Systems Administrator',
  'Database Administrator',
  'Network Engineer',
  'Technical Writer',
  'Sales Engineer',
  'Solutions Architect',
  'IT Support',
  'Help Desk',
  'Cybersecurity Analyst',
  'Blockchain Developer',
  'Game Developer',
  'Embedded Systems Engineer',
  'Marketing Manager',
  'Content Writer',
  'HR Manager',
  'Financial Analyst',
  'Accountant',
  'Customer Success Manager',
  'Operations Manager',
  'Supply Chain Manager',
  'Mechanical Engineer',
  'Electrical Engineer',
  'Civil Engineer',
  'Nurse',
  'Teacher',
  'Pharmacist',
  'Executive Assistant',
  'Intern',
];

export const SALARY_RANGES = [
  { label: 'Any Salary', min: null, max: null },
  { label: '$30,000 - $50,000', min: 30000, max: 50000 },
  { label: '$50,000 - $70,000', min: 50000, max: 70000 },
  { label: '$70,000 - $90,000', min: 70000, max: 90000 },
  { label: '$90,000 - $110,000', min: 90000, max: 110000 },
  { label: '$110,000 - $130,000', min: 110000, max: 130000 },
  { label: '$130,000 - $150,000', min: 130000, max: 150000 },
  { label: '$150,000 - $200,000', min: 150000, max: 200000 },
  { label: '$200,000+', min: 200000, max: null },
];

export const JOB_TYPES = [
  'All Types',
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Temporary',
];
