import {z} from "zod"
import { validDateString } from "@/lib/utils"

export const defaultModels:string[] = ["Module A","Module B", "Module C"]
export const modulesReady:string[] = defaultModels.concat(["Module D","Module E"])

export const PossilbeRoles = ["admin","managedStudent","teacher","unmanagedStudent"] as const
export const  UserRoleSchema = z.enum(PossilbeRoles)
export type UserRoleType = z.infer<typeof UserRoleSchema>
export const RoleArraySchema = z.array(UserRoleSchema)
export const nonAdminRoles = PossilbeRoles.filter(role=>role!=="admin")


export type RoleArrayType = z.infer<typeof RoleArraySchema>

const RoleRecordSchema =z.record(UserRoleSchema,z.object({
  name:z.string().trim().nonempty(),
  id:z.string().trim().nonempty(),
}))

type RoleRecord =z.infer<typeof RoleRecordSchema>

export const roleMapping: RoleRecord = {
  admin: {
    name: "admin",
    id: "rol_dhBIdUmGdNR52dha",
  },
  managedStudent: {
    name: "student",
    id: "rol_sscS5jlEm9eNoQhh",
  },
  teacher: {
    name: "teacher",
    id: "rol_2TX6jO3b0TbA1z7y",
  },
  unmanagedStudent: {
    name: "unmanaged student",
    id: "rol_JHWVsaPKEqqHno00",
  },
};


const IdentitySchema = z.object({
  connection: z.string(),
  user_id: z.string(),
  provider: z.string(),
  isSocial: z.boolean(),
});

export const UserMetadataSchema = z.object({
  account_expiration_date: z.string().refine(str=>validDateString(str),
  {message:"Invalid date string,Please provide the date string in the format of YYYY-MM-DD"})
  .nullish(),
  enrolled_class_id: z.string().trim().nonempty().nullish(),
  teaching_class_ids:z.array(z.string().trim().nonempty()).nullish(),
  available_modules:z.array(z.string().trim().nonempty()).nullish(),
}).passthrough();

export type UserMetadataType = z.infer<typeof UserMetadataSchema>

const AppmetadataSchema = z.object({}).passthrough();

export const UserSchema = z.object({
  created_at: z.string(),
  email: z.string(),
  email_verified: z.boolean(),
  family_name: z.string(),
  given_name: z.string(),
  identities: z.array(IdentitySchema),
  name: z.string(),
  nickname: z.string().optional(),
  picture: z.string(),
  updated_at: z.string().optional(),
  user_id: z.string(),
  user_metadata: UserMetadataSchema.optional(),
  app_metadata: AppmetadataSchema.optional(),
}).passthrough();

export type UserType = z.infer<typeof UserSchema>

export const UserArrayScehma = z.array(UserSchema.nullable().optional())
export type UserArrayType = z.infer<typeof UserArrayScehma>

export const UserSearchResponseSchema = z.object({
  email:z.string(),
  name:z.string(),
  user_id: z.string(),
  user_metadata: UserMetadataSchema.optional(),
  app_metadata: AppmetadataSchema.optional(),
}).passthrough()

export type UserSearchResponseType = z.infer<typeof UserSearchResponseSchema>

export const  UserSearchResponseArraySchema = z.array(UserSearchResponseSchema)
export type UserSearchResponseArrayType =z.infer<typeof UserSearchResponseArraySchema>

export const RoledUserSchema = UserSearchResponseSchema.extend({
  roles:RoleArraySchema ,
});

export type RoledUserType = z.infer<typeof RoledUserSchema>

export const RoledUserArraySchema = z.array(RoledUserSchema)
export type RoledUserArrayType = z.infer<typeof RoledUserArraySchema>

export const UserCreationBodySchema = z.object({
  connection: z.string(),
  email: z.string(),
  password: z.string(),
  verify_email: z.boolean(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  name: z.string(),
  user_metadata: UserMetadataSchema,
  app_metadata: AppmetadataSchema,
});

export type UserCreationBodyType = z.infer<typeof UserCreationBodySchema>

const AssignRoleBodySchema = z.object({
  roles: z.array(z.string()),
});

export type AssignRoleBodyType = z.infer<typeof AssignRoleBodySchema>

export const RoleCheckResponseSchema = z.array(z.object({
  id: z.string(),
  name: UserRoleSchema,
  description: z.string(),
}));






