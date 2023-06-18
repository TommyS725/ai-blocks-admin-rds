import type { NextApiRequest, NextApiResponse } from "next";
import {z} from "zod"
import {
  createUser,
  getAccessToken,
  checkRole,
  searchUser,
  sendInvitation,
  updateUser,
  deleteUser,
} from "@/lib/auth0_user_management";

import {
  PutUsersReqSchema,
  PostUsersReqSchema,
  PostUsersResType,
  UserCreateDataType,
} from "@/models/api_schemas";
import { delay ,removeDuplicates,errorMessage} from "@/lib/utils";
import { adminCheck } from "@/lib/api_utils";


const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    // console.log(req.query)
    let  { email,enrolled_class_id,teaching_class_ids,type} = req.query;
    if([email,enrolled_class_id,teaching_class_ids].every(query=>!query)){
      res.status(400).json({message:"Please provide at least one search query."})
    }
    const inputs = [email,enrolled_class_id,teaching_class_ids]
    .map(input=>{
      if(input===undefined) return undefined
      if(!Array.isArray(input)) return [input]
      return removeDuplicates(input)
    })
    const  query = {
      email:inputs[0],
      enrolled_class_id:inputs[1],
      teaching_class_ids:inputs[2],
    }
    const searchType = type==="AND"||type==="OR"?type:undefined
    // console.log(query,searchType)
    const token = await getAccessToken();
    const users = await searchUser(token, query,searchType);
    res.status(200).json(users);
    return;
  } catch (error: any) {
    res.status(500).json({message:errorMessage(error,true)})
    return;
  }
};

const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    // console.log(req.body)
    const token = await getAccessToken();
    const {user,users,role,enrolled_class_id,teaching_class_ids,available_modules,account_expiration_date,}
     = PostUsersReqSchema.parse(req.body);
    let success =0;
    let fail = 0
    let details:string[] = []
    if (users?.length) {
      if (!role) throw new Error("Role is required for batch create.");
      for (const index in users) {
        const { email, first_name, last_name } = users[index];
        try {
          const payload: UserCreateDataType = {
            email,
            first_name,
            last_name,
            role,
            enrolled_class_id,
            teaching_class_ids,
            available_modules,
            account_expiration_date,
          };
          const data = await createUser(token, payload);
          await sendInvitation(token, data.name, data.email)
          success+=1;
          const message = `account creation for ${data.email} is done`;
          details.push(message)
          console.log(message);
        } catch (error: any) {
          const message = errorMessage(error,true)
          details.push(message)
          fail+=1
        }
        await delay(500);
      }
    }
    if (user) {
      try {
        const data = await createUser(token, user);
        await sendInvitation(token, data.name, data.email);
        const message = `account creation for ${data.email} is done`;
        success +=1
        console.log(message);
        details.push(message)
      } catch (error: any) {
        const message = errorMessage(error,true)
        details.push(message)
        fail+=1
      }
    }
    res.status(success>=1 ? 201 : 500).json({ message:`
    Successful case${success>1?"s":""}: ${success} | Failed case${fail>1?"s":""}: ${fail}
    `,details});
    return;
  } catch (error: any) {
    if(error instanceof z.ZodError){
      res.status(400).json({message:"Invalid body content type"})
      return
    }
    res.status(500).json({message:errorMessage(error,true)})
    return;
  }
};

const handlePut = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const token = await getAccessToken();
    const payload = PutUsersReqSchema.parse(req.body);
    // console.log(payload)
    const roles = await checkRole(token, payload.userId);
    const data = await updateUser(token, payload, roles);
    // console.log(data)
    res.status(200).json(data);
    return;
  } catch (error: any) {
    if(error instanceof z.ZodError){
      res.status(400).json({message:"Invalid body content type"})
      return
    }
    res.status(500).json({message:errorMessage(error,true)})
    return;
  }
};

const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const token = await getAccessToken();
    let { userId } = req.query;
    if (userId == undefined||Array.isArray(userId)) {
      res.status(400).json({message:"Please provide one and only one non-empty userId"});
      return;
    } 
    const data = await deleteUser(token, userId.trim());
    console.log(`deleted user, user_id: ${userId}`);
    res.status(204).end();
    return;
  } catch (error: any) {
    if(error instanceof z.ZodError){
      res.status(400).json({message:"Invalid body content type"})
      return
    }
    res.status(500).json({message:errorMessage(error,true)})
    return;
  }
};

const handler = async (req: NextApiRequest,res: NextApiResponse) => {
  //configurate for authentication
  if(!await adminCheck(req,res)){
    return
  }
  const method: string | undefined = req.method;
  switch (method) {
    case "GET":
      await handleGet(req, res);
      break;
    case "POST":
      await handlePost(req, res);
      break;
    case "PUT":
      await handlePut(req, res);
      break;
    case "DELETE":
      await handleDelete(req, res);
      break;
    default:
      res.status(405).json({message:`${method} is not supported`});
      break;
  }
};

export default handler;
