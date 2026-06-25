import { PrismaClient, RequestStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  await prisma.session.deleteMany(); await prisma.classroomRequest.deleteMany(); await prisma.subject.deleteMany(); await prisma.classroom.deleteMany(); await prisma.user.deleteMany(); await prisma.career.deleteMany();
  const careerData = [["Ingeniería en Tecnología de Software","ITS"],["Ingeniería en Electrónica y Comunicaciones","IEC"],["Ingeniería Mecánico Administrador","IMA"],["Ingeniería en Administración de Sistemas","IAS"],["Ingeniería Mecánica Eléctrica","IME"],["Ingeniería Mecatrónica","IMTC"]];
  const careers = await Promise.all(careerData.map(([name,acronym])=>prisma.career.create({data:{name,acronym}})));
  const passwordHash = await bcrypt.hash("admin123",12);
  const people = [
    ["Juan García Gallegos","admin@uanl.edu.mx",UserRole.ADMIN,0], ["Juan Pérez Rodríguez","juan.perez@uanl.edu.mx",UserRole.TEACHER,0],
    ["Eduardo Gallegos","eduardo.gallegos@uanl.edu.mx",UserRole.TEACHER,1], ["Mauricio Castillo","mauricio.castillo@uanl.edu.mx",UserRole.COORDINATOR,0],
    ["Omar Herrera","omar.herrera@uanl.edu.mx",UserRole.TEACHER,2], ["María Rojas","maria.rojas@uanl.edu.mx",UserRole.COORDINATOR,3],
    ["Francisco Elías","francisco.elias@uanl.edu.mx",UserRole.TEACHER,4], ["Verónica Rivera","veronica.rivera@uanl.edu.mx",UserRole.TEACHER,3],
    ["Guadalupe Pérez","guadalupe.perez@uanl.edu.mx",UserRole.TEACHER,0], ["Emilio Vázquez","emilio.vazquez@uanl.edu.mx",UserRole.COORDINATOR,2]
  ] as const;
  const users = await Promise.all(people.map(([name,email,role,ci])=>prisma.user.create({data:{name,email,passwordHash,role,careerId:careers[ci].id}})));
  const subjectSpecs = [["DISMOV","Ingeniería en Dispositivos Móviles",6,[0,3]],["MATIV","Matemáticas IV",4,[1]],["BD","Bases de Datos",5,[0,3]],["IA","Inteligencia Artificial",7,[0,2,3]],["REDES","Redes de Computadoras",6,[0,1]],["ARQ","Arquitectura de Computadoras",5,[0,4]],["CALC","Cálculo Diferencial",2,[1,2,4]],["PROG","Programación",1,[0,3,5]] ] as const;
  const subjects = await Promise.all(subjectSpecs.map(([code,name,semester,ids])=>prisma.subject.create({data:{code,name,semester,coordination:"Coordinación",careers:{connect:ids.map(i=>({id:careers[i].id}))}}})));
  const classrooms=await Promise.all([["9206","9",2,36,"Aula"],["9203","9",2,36,"Aula"],["1205","1",2,35,"Aula"],["2201","2",2,40,"Aula"],["3104","3",1,30,"Laboratorio"]].map(([number,building,floor,capacity,type])=>prisma.classroom.create({data:{number:String(number),building:String(building),floor:Number(floor),capacity:Number(capacity),type:String(type)}})));
  const statuses=[RequestStatus.PENDING,RequestStatus.REJECTED,RequestStatus.APPROVED,RequestStatus.PENDING,RequestStatus.PENDING,RequestStatus.APPROVED,RequestStatus.PENDING,RequestStatus.REJECTED];
  for(let i=0;i<statuses.length;i++){const status=statuses[i];await prisma.classroomRequest.create({data:{coordinatorId:users[3].id,careerId:careers[0].id,subjectId:subjects[i%subjects.length].id,classroomId:classrooms[i%classrooms.length].id,semester:subjects[i%subjects.length].semester,status,rejectionReason:status===RequestStatus.REJECTED?"El salón no está disponible.":null,reviewedById:status===RequestStatus.PENDING?null:users[0].id,reviewedAt:status===RequestStatus.PENDING?null:new Date()}})}
}
main().then(()=>console.log("Base de datos inicializada.")).catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
