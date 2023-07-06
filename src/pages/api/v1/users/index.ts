import type { NextApiRequest, NextApiResponse } from "next";
import {z} from "zod"
import {
  createUser,
  getAccessToken,
  searchUser,
  sendInvitation,
  updateUser,
  deleteUser,
  getUserByID,
  deleteRole,
  assignRole,
  checkRole,
} from "@/lib/auth0_user_management";

import { DeleteUsersReqSchema, PostUsersReqSchema, PutUsersReqSchema, SearchUsersReqSchema, emailSchema } from "@/models/api_schemas";
import { delay , zodErrorMessage} from "@/lib/utils";
import { APIError, adminCheck, ServerErrorHandler } from "@/lib/api_utils";
import { classUpdatable,  updateClass } from "@/lib/class_management";
import {  RoledUserType } from "@/models/auth0_schemas";
import { TaskHandler } from "@/lib/task-handler";



// const handleGet = async (
//   req: NextApiRequest,
//   res: NextApiResponse
// ) => {
//   try {
//     // console.log(req.query)
//     //validate and turn all string to string[]
//     const parsing = SearchUsersReqSchema.safeParse(req.query)
//     if(!parsing.success){
//       throw new APIError("Invalid Request Params",zodErrorMessage(parsing.error.issues))
//     }
//     const query = {
//       email:parsing.data.email,
//       teaching_class_ids:parsing.data.teaching_class_ids,
//       enrolled_class_id:parsing.data.enrolled_class_id
//     }
//     const searchType = parsing.data.type
//     const token = await getAccessToken();
//     const users = await searchUser(token, query,searchType);
//     // console.log(users)
//     res.status(200).json(users);
//     return;
//   } catch (error: any) {
//     const handler = new ServerErrorHandler(error)
//     handler.log()
//     handler.sendResponse(req,res)
//   }
// };

const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const parsing = PostUsersReqSchema.safeParse(req.body)
    if(!parsing.success){
      throw new APIError("Invalid Request Body",zodErrorMessage(parsing.error.issues))
    }
    const payload = parsing.data
    const taskHandler = new TaskHandler()
    taskHandler.logic.createSingleUser(payload)
    await taskHandler.start()
    const user = taskHandler.getSingleUser(payload.email,payload.role)
    // //check for class updatable, thow error if invalid
    // if(payload.role==="managedStudent"){
    //   if(!payload.enrolled_class_id) throw new APIError("Invalid Request Body","Class ID is required for managed student.")
    //   await classUpdatable({
    //     class_id:payload.enrolled_class_id,
    //     addStudents:[payload.email]
    //   })
    // }else if(payload.role==="teacher"&&payload.teaching_class_ids?.length){
    //   for(const class_id of payload.teaching_class_ids){
    //     await classUpdatable({
    //       class_id,
    //       addTeachers:[payload.email]
    //     })
    //     await delay(300)
    //   }
    // }
    // const token = await  getAccessToken()
    // //craete user
    // const user = await createUser(token,payload)
    // //update classes
    // if(payload.role==="managedStudent"){
    //   if(!payload.enrolled_class_id) throw new APIError("Invalid Request Body","Class ID is required for managed student.")
    //   await updateClass({
    //     class_id:payload.enrolled_class_id,
    //     addStudents:[payload.email]
    //   })
    // }else if(payload.role==="teacher"&&payload.teaching_class_ids?.length){
    //   for(const class_id of payload.teaching_class_ids){
    //     await updateClass({
    //       class_id,
    //       addTeachers:[payload.email]
    //     })
    //     await delay(300)
    //   }
    // }
    // //send inviation
    // await sendInvitation(token,user.name,user.email)
    res.status(201).json(user)
  } catch (error) {
    const handler = new ServerErrorHandler(error)
    handler.log()
    handler.sendResponse(req,res)
  }
};


// const handleClassChange =async (token:string,user:RoledUserType,enrolled_class_id:string|undefined|null
//   ,teaching_class_ids:string[]|undefined|null) => {
//   if(enrolled_class_id===undefined&&teaching_class_ids===undefined) return
//   const roles = user.roles
//   if(roles.includes("teacher")&&teaching_class_ids!==undefined){
//     const newClasses = teaching_class_ids??[]
//     const oldClasses = user.user_metadata?.teaching_class_ids??[]
//     //classes in updateds ids but not in present ids
//     const toAdd = newClasses.filter(id=>!oldClasses.includes(id))
//     //classes not in updated ids but in present ids
//     const toRemove = oldClasses.filter(id=>!newClasses.includes(id))
//     //will check for validity of class ID 
//     //update will stop if one of the update fail, put in try catch to ignore
//     for(const class_id of toAdd){
//       const payload = {
//         class_id,
//         addTeachers:[user.email]
//       }
//       //will throw error if not updatable
//       await classUpdatable(payload)
//       await updateClass(payload)
//       await delay(300)
//     }
//     for(const class_id of toRemove){
//       const payload ={
//         class_id,
//         removeTeachers:[user.email]
//       }
//       //will throw error if not updatable
//       await classUpdatable(payload)
//       await updateClass(payload)
//       await delay(300)
//     }
//     //no need to reassign role
//   }
//   if(roles.includes("managedStudent")&&enrolled_class_id!==undefined){
//     if(enrolled_class_id){
//       //change class
//       const toRemove = user.user_metadata?.enrolled_class_id
//       if(!toRemove) throw new APIError("Auth0 Error",`Enrolled class id undefined in managed student, email: ${user.email}`)
//       //add to new class
//       const addPayload = {
//         class_id:enrolled_class_id,
//         addStudents:[user.email]
//       }
//        //will throw error if not updatable
//       await classUpdatable(addPayload)
//       await updateClass(addPayload)
//       await delay(300)
//       //remove from old class
//       const removePayload = {
//         class_id:toRemove,
//         removeStudents:[user.email]
//       }
//       //will throw error if not updatable
//        await classUpdatable(removePayload)
//       await updateClass(removePayload)
//       //no need to reassign role
//     }else{
//       //become unmanaged
//       const toRemove = user.user_metadata?.enrolled_class_id
//       if(!toRemove) throw new APIError("Auth0 Error",`Enrolled class id undefined in managed student, email: ${user.email}`)
//       const payload = {
//         class_id:toRemove,
//         removeStudents:[user.email]
//       }
//       //will throw error if not updatable
//       await classUpdatable(payload)
//       await updateClass(payload)
//       //reassign role 
//       await deleteRole(token,user.user_id,"managedStudent")
//       await delay(300)
//       await assignRole(token,user.user_id,"unmanagedStudent")
//     }
//   }
//   else if(roles.includes("unmanagedStudent")&&enrolled_class_id){
//     //become managed student
//     const payload = {
//       class_id:enrolled_class_id,
//       addStudents:[user.email]
//     }
//     //will throw error if not updatable
//     await classUpdatable(payload)
//     await updateClass(payload)
//     await deleteRole(token,user.user_id,"unmanagedStudent")
//     await delay(500)
//     await assignRole(token,user.user_id,"managedStudent")
//   }
// }

// const handlePut = async (
//   req: NextApiRequest,
//   res: NextApiResponse
// ) => {
//   try {
//     const parsing = PutUsersReqSchema.safeParse(req.body)
//     if(!parsing.success){
//       throw new APIError("Invalid Request Body",zodErrorMessage(parsing.error.issues))
//     }
//     const payload = parsing.data;
//     const token = await getAccessToken();
//     const user = await getUserByID(token,payload.userId)
    
//     // console.log(payload)
//     const roles = user.roles
//     //will check for the avldiity of class changes, then perform actual class change and role change
//     await handleClassChange(token,user,payload.content.enrolled_class_id,payload.content.teaching_class_ids)
//     //update the actual user data
//     const data = await updateUser(token, payload, roles);
//     const newRoles = await checkRole(token,data.user_id)
//     // console.log(data)
//     res.status(200).json({...data,roles:newRoles});
//     return;
//   } catch (error: any) {
//     const handler = new ServerErrorHandler(error)
//     handler.log()
//     handler.sendResponse(req,res)
//   }
// };

// const handleDelete = async (
//   req: NextApiRequest,
//   res: NextApiResponse
// ) => {
//   try {
//     const parsing = DeleteUsersReqSchema.safeParse(req.query)
//     if (!parsing.success) {
//       throw new APIError("Invalid Request Params","Please provide one and only one non-empty userId")
//     }
//     const {userId} = parsing.data
//     const token = await getAccessToken();
//     const user = await getUserByID(token,userId)
//     //update the classes,check for validity for class IDs
//     //IMPORTANT:will stop deletion if the removal is unsuccess
//     if(user.roles.includes("teacher")){
//       //handle teaching classes
//       const toRemove = user.user_metadata?.teaching_class_ids??[]
//       for (const class_id of toRemove){
//         await updateClass({
//           class_id,
//           removeTeachers:[user.email]
//         })
//         await delay(300)
//       }
//     }
//     if(user.roles.includes("managedStudent")){
//       //handle enrolled class
//       const class_id  = user.user_metadata?.enrolled_class_id
//       if(!class_id) throw new APIError("Auth0 Error",`Enrolled class id undefined in managed student, email: ${user.email}`)
//       await updateClass({
//         class_id,
//         removeStudents:[user.email]
//       })
//     }
//     const data = await deleteUser(token, userId);
//     console.log(`deleted user, user_id: ${userId}`);
//     res.status(204).end();
//     return;
//   } catch (error: any) {
//     const handler = new ServerErrorHandler(error)
//     handler.log()
//     handler.sendResponse(req,res)
//   }
// };

const handler = async (req: NextApiRequest,res: NextApiResponse) => {
  //configurate for authentication
  if(!await adminCheck(req,res)){
    return
  }
  const method: string | undefined = req.method;
  switch (method) {
    // case "GET":
    //   await handleGet(req, res);
    //   break;
    case "POST":
      await handlePost(req, res);
      break;
    // case "PUT":
    //   await handlePut(req, res);
    //   break;
    // case "DELETE":
    //   await handleDelete(req, res);
    //   break;
    default:
      res.status(405).json({
        status:405,
        message:`${method} is not supported`,
        details:{
          resource: req.url,
          method: req.method
        }
      });
      break;
  }
};

export default handler;
