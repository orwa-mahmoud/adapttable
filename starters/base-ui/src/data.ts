export interface Person {
  id: string;
  name: string;
  role: string;
  status: "active" | "on-leave" | "retired";
  salary: number;
  hiredAt: string;
}

export const people: Person[] = [
  {
    id: "1",
    name: "Ada Lovelace",
    role: "Engineer",
    status: "active",
    salary: 96000,
    hiredAt: "2021-03-01",
  },
  {
    id: "2",
    name: "Alan Turing",
    role: "Founder",
    status: "active",
    salary: 145000,
    hiredAt: "2019-06-15",
  },
  {
    id: "3",
    name: "Grace Hopper",
    role: "Admiral",
    status: "retired",
    salary: 132000,
    hiredAt: "2018-01-20",
  },
  {
    id: "4",
    name: "Katherine Johnson",
    role: "Mathematician",
    status: "active",
    salary: 118000,
    hiredAt: "2020-09-10",
  },
  {
    id: "5",
    name: "Edsger Dijkstra",
    role: "Engineer",
    status: "on-leave",
    salary: 101000,
    hiredAt: "2022-02-14",
  },
  {
    id: "6",
    name: "Barbara Liskov",
    role: "Architect",
    status: "active",
    salary: 154000,
    hiredAt: "2017-11-05",
  },
  {
    id: "7",
    name: "Linus Torvalds",
    role: "Engineer",
    status: "active",
    salary: 128000,
    hiredAt: "2016-04-25",
  },
  {
    id: "8",
    name: "Margaret Hamilton",
    role: "Director",
    status: "active",
    salary: 162000,
    hiredAt: "2015-07-30",
  },
  {
    id: "9",
    name: "Tim Berners-Lee",
    role: "Founder",
    status: "on-leave",
    salary: 149000,
    hiredAt: "2019-12-01",
  },
  {
    id: "10",
    name: "Radia Perlman",
    role: "Architect",
    status: "active",
    salary: 141000,
    hiredAt: "2018-08-19",
  },
  {
    id: "11",
    name: "Ken Thompson",
    role: "Engineer",
    status: "retired",
    salary: 137000,
    hiredAt: "2014-05-12",
  },
  {
    id: "12",
    name: "Frances Allen",
    role: "Researcher",
    status: "active",
    salary: 123000,
    hiredAt: "2020-01-08",
  },
];
