import { FC, FormEvent,useState, Dispatch, SetStateAction, useId, useEffect} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {z}from "zod";
import { X, Search,ChevronsUpDown,Check} from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "./ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "./ui/use-toast";
import { Label } from "./ui/label";

import { cn, errorMessage } from "@/lib/utils"
import { RoledUserArraySchema, RoledUserArrayType, RoledUserType ,modulesReady} from "@/models/auth0_schemas";
import ShowExpiration from "./ShowExpiration";
import { UpdateAllExpiration } from "./UpdateExpiration";
import RemoveStudentFromClass from "./removeStudentFromClass";
import DeleteClass from "./DeleteClass";
import { GetClassResSchema, GetClassesResType, PutClassesReqType } from "@/models/api_schemas";



const formSchema = z.object({
  userId: z.string().trim().email().nonempty(),
});

interface Props {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  handleChangeClass :(data:GetClassesResType|undefined)=>Promise<void>
}

const SearchTeacher: FC<Props> = ({ isLoading,setIsLoading,handleChangeClass}) => {
    const [classId,setClassId] = useState("")
    const [teacher,setTeacher] = useState<RoledUserType | undefined>();
    const [open, setOpen] = useState<boolean>(false)
    const [message,setMessage] = useState("")
    const teaching =teacher?.user_metadata?.teaching_class_ids??[]
    const {toast} = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
    },
  });
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setTeacher(undefined);
    await handleChangeClass(undefined)
    setIsLoading(true);
    try {
      // console.log(values);
      const response = await axios.get(
        `/api/users?email=${values.userId}`
      );
      const data = RoledUserArraySchema.parse(response.data);
      if (!data.length||!data[0].roles.includes("teacher")) {
        form.setError("userId",{message:"Invalid teacher ID!"})
        setIsLoading(false);
        return
      }
      setTeacher(data[0]);
    } catch (error: any) {
      const str = errorMessage(error)
      toast({
        variant:"destructive",
        title: "Search error",
        description: str,
      })
    }
    setIsLoading(false);
  };

  const handleSelect = async (class_id:string) => {
    if(isLoading) return
    if(!class_id.length){
      await handleChangeClass(undefined)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      // console.log("/api/classes?class_id="+class_id)
      const {data} = await axios.get("/api/classes?class_id/"+class_id)
      if(!data){
        setMessage("Invalid class ID")
        await handleChangeClass(undefined)
      }
      // console.log(data)
      await handleChangeClass(GetClassResSchema.parse(data))
    } catch (error:any) {
      errorMessage(error)
      await handleChangeClass(undefined)
    }
    setIsLoading(false)
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-1/2 my-4">
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex gap-2 items-center">
                  Find by teacher ID (email)
                  <Search size={16} />
                </FormLabel>
                <div className="flex gap-5 items-center">
                  <Input
                    placeholder="Search..."
                    {...field}
                    type="email"
                  ></Input>
                  <FormControl>
                  <Button
                    onClick={() => form.reset()}
                    variant={"ghost"}
                    className="p-1"
                    type="reset"
                  >
                    <X size={30} />
                  </Button>
                  </FormControl>
                  <FormControl>
                    <Button
                      type="submit"
                      className=" rounded-xl"
                      disabled={isLoading}
                    >
                      {isLoading ? "loading..." : "search"}
                    </Button>
                  </FormControl>
                </div>
                <FormMessage/>
              </FormItem>
            )}
          />
        </form>
      </Form>{
        teacher?<>
        <div className="my-4 flex space-x-10 items-center">
            <p className="space-x-1">
                <span>Name: </span>
                <span>{teacher.name}</span>
            </p>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                    disabled={isLoading}
                    >
                    {classId
                        ? <span className=" truncate">{classId}</span>
                        : "Select class ID..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                    <CommandInput placeholder="Search class ID..." />
                    <CommandEmpty>No class ID found.</CommandEmpty>
                    <CommandGroup>
                        {teaching.map((id,index) => (
                        <CommandItem
                            key={id+index}
                            onSelect={async(currentValue) => {
                                setOpen(false)
                                setMessage("")
                                const id = currentValue === classId ? "" : currentValue
                                setClassId(id)
                                // console.log(id)
                                await handleSelect(id)
                            }}
                        >
                            <Check
                            className={cn(
                                "mr-2 h-4 w-4",
                                classId === id ? "opacity-100" : "opacity-0"
                            )}
                            />
                            {id}
                        </CommandItem>
                        ))}
                    </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
            <p className=" text-destructive text-sm">
              {message}
            </p>
        </div>
        </>:null
      }
    </>
  );
};


const InputClassID:FC<Props> = ({ isLoading,setIsLoading,handleChangeClass})=>{
    const [value,setValue] = useState<string>("")
    const [message,setMessage] = useState<string>("")
    const inputId = useId()

    const handleSubmit = async(e:FormEvent<HTMLFormElement>)=>{
        e.preventDefault()
        const input = value.trim()
        if(!input.length){
            setMessage("Please fill in class ID.")
            return
        }
        if(isLoading) return
        setIsLoading(true)
        try {
          // console.log("/api/classes?class_id="+class_id)
          const {data} = await axios.get("/api/classes?class_id/"+input)
          if(!data){
            setMessage("Invalid class ID")
            await handleChangeClass(undefined)
          }
          // console.log(data)
          await handleChangeClass(GetClassResSchema.parse(data))
        } catch (error:any) {
          errorMessage(error)
          await handleChangeClass(undefined)
        }
        setIsLoading(false)
    }

    return<>
    <form className="my-4 w-1/2 space-y-2" onSubmit={handleSubmit}>
         <Label className={cn("flex gap-2 items-center",message.length?"text-destructive":"")} htmlFor={inputId}>
            Find by class ID
            <Search size={16} />
        </Label>
        <div className="flex gap-5 items-center" id={inputId}>
                  <Input
                    placeholder="Search..."
                    value={value}
                    onChange={(e)=>{setValue(e.target.value);setMessage("")}}
                  ></Input>
                  <Button
                    onClick={() => setValue("")}
                    variant={"ghost"}
                    className="p-1"
                    type="reset"
                  >
                    <X size={30} />
                  </Button>
                    <Button
                      type="submit"
                      className=" rounded-xl"
                      disabled={isLoading}
                    >
                      {isLoading ? "loading..." : "search"}
                    </Button>
        </div>
        <div className="text-sm font-medium text-destructive">{message}</div>
    </form>
    </>

}

interface CapacProps extends Props{
  data:GetClassesResType
}

const UpdateCapacity:FC<CapacProps> =({isLoading,setIsLoading,handleChangeClass,data})=>{
  const {toast} = useToast()
  const updateScehma = z.object({
    capacity:z.string().nonempty({message:"Required"}).refine(cap=>!isNaN(Number(cap)),{message:"Invalid input"})
  }).refine(input=>{
    const cap = Number(input.capacity)
    return cap !==data.capacity
  },{message:"Updated capacity must not be same as the old value."})

  const form = useForm<z.infer<typeof updateScehma>>({
    resolver: zodResolver(updateScehma),
    defaultValues: {
      capacity:String(data.capacity)
    },
  });

  const onSubmit = async(values:z.infer<typeof updateScehma>)=>{
    if(isLoading) return 
    setIsLoading(true)
    try {
      const payload:PutClassesReqType = {
        class_id:data.class_id,
        capacity:Number(values.capacity)
      }
      const response = await axios.put('/api/classes',payload)
      toast({
        title:"Updated"
      })
      await handleChangeClass(GetClassResSchema.parse(response.data))
    } catch (error:any) {
      const message = errorMessage(error)
      toast({
        variant:"destructive",
        title: "Update error",
        description: message,
      })
    }
  }

  const disableSave = form.watch("capacity") === String(data.capacity)

  return<>
    <Dialog>
        <DialogTrigger asChild>
          <Button disabled={isLoading} variant={"secondary"} className="">
            {isLoading ? "loading..." : "Update class capacity"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Update capacity</DialogTitle>
              <DialogDescription>
               Update the capacity of {data.class_id}. Click save when you are done.
              </DialogDescription>
            </DialogHeader>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="update cap">
                  Update Capacity
                </FormLabel>
                <Input
                    id = "update cap"
                    type="number"
                    min="1"
                    {...field}
                      />
                <FormDescription>
                <span>Current number of students: {data.studentIds.length}. Current capacity: {data.capacity}</span>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
            <DialogFooter>
              <FormControl>
              <Button type="submit" disabled={isLoading||disableSave} className="mt-4"> 
                {isLoading ? "Loading..." : "Save changes"}
              </Button>
              </FormControl>
            </DialogFooter>
        </form>
      </Form>
        </DialogContent>
      </Dialog>
      
  </>
}


const ManageClass: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<GetClassesResType>()


  const [users,setUsers] = useState<RoledUserArrayType>([])
  const teachers= users.filter(user=>user.roles.includes("teacher"))
  const students = users.filter(user=>user.roles.includes("managedStudent"))

  const [availableModules,setAvailableModules] = useState<string[]>([])
  const modulesToAdd:string[] = modulesReady.filter(module=>!availableModules.includes(module))
  const disableSave:boolean = data?.available_modules.toString()===availableModules.toString()

  const {toast} = useToast()

  const reload = async(currentClass:GetClassesResType|undefined = data)=>{
    // console.log(currentClass)
    if(!currentClass) return
    setAvailableModules(currentClass.available_modules)
    setIsLoading(true);
    try {
      const emails = currentClass.studentIds.concat(currentClass.teacherIds)
      if(!emails.length){
        setIsLoading(false);
        return
      }
      let url = `/api/users?type=OR`
      for(const email of emails){
        url+=`&email=${email}`
      }
      const response = await axios.get(url);
      const data = RoledUserArraySchema.parse(response.data);
      // console.log(data)
      setUsers(data)
    } catch (error: any) {
      const message = errorMessage(error)
      toast({
        variant:"destructive",
        title: "Search error",
        description: message,
      })
    }
    setIsLoading(false);
  }

  const handleChangeClass =async (payload:GetClassesResType|undefined):Promise<void> => {
    // console.log(payload)
    setData(payload)
    setUsers([])
    setAvailableModules(payload?.available_modules??[])
    if(!payload) return
    await reload(payload)
  }
  

  const handleAddModule = (toAdd:string)=>{
    setAvailableModules(prev=>[...prev,toAdd].sort())
  }
  const handleRemoveModule = (toRemove:string)=>{
    setAvailableModules(prev=>prev.filter(module=>module!==toRemove).sort())
  }
  const handleSaveModules = async ()=>{
    if(!data) return
    setIsLoading(true)
    try {
        //ftech server
        const payload:PutClassesReqType = {
            class_id:data.class_id,
            available_modules:availableModules
        }
        // console.log(payload)
        const response = await axios.put("/api/classes",payload)
        toast({
          title:"Updated"
        })
        const updated = GetClassResSchema.parse(response.data)
        await handleChangeClass(updated)
    } catch (error:any) {
      const message = errorMessage(error)
      toast({
        variant:"destructive",
        title: "Update error",
        description: message,
      })
    }
    setIsLoading(false)
  }
  

  return (
    <>
    <div className="m-8">
    {/* <div>Class ID: {classId}</div> */}
    <Tabs defaultValue="teacher" className="">
    <div className="flex justify-center">
      <TabsList className="">
        <TabsTrigger value="teacher">By teacher</TabsTrigger>
        <TabsTrigger value="classId">By class ID</TabsTrigger>
      </TabsList>
    </div>
      <TabsContent value="teacher">
        <SearchTeacher {...{isLoading,setIsLoading,handleChangeClass} }/>
        </TabsContent>
        <TabsContent value="classId">
        <InputClassID {...{isLoading,setIsLoading,handleChangeClass} }/>
        </TabsContent>
      </Tabs>
      {data&&!isLoading?<>
      {/* <pre>{JSON.stringify(data,null,2)}</pre> */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3 col-span-2">
          <p>Class ID:</p>
          <p>{data.class_id}</p>
          <p>Teachers in class:</p>
          <p className="space-x-3">{teachers.map((teacher,index)=>{
            return <span key={`${teacher.email}-${index}`}>{`${teacher.name} (${teacher.email})`}</span>
          })}</p>
        </div>
        <div className=" space-y-3">
            <div className="flex space-x-4 items-center">
              <p>Students ({students.length}/{data.capacity})</p>
              <UpdateCapacity {...{isLoading,setIsLoading,handleChangeClass,data}}/>
            </div>
            <div className="h-2/3 overflow-auto w-full rounded-md border border-input bg-transparent px-3 py-2 ">
                <ul>
                    {students.map((student,index)=>{
                    return <li key ={`${module}-${index}`} className="flex items-center  space-x-4">
                            <span>{`${index+1}.`}</span>
                            <span className="mx-4">{student.name}</span>
                            <span>{student.email}</span>
                            <ShowExpiration expiration={student.user_metadata?.account_expiration_date} content=""/>
                            <div className="flex-grow flex justify-end">
                              <RemoveStudentFromClass {...{student,reload,isLoading,setIsLoading}}/>
                            </div>
                        </li>
                    })}
                </ul>
            </div>
            <UpdateAllExpiration {...{isLoading,setIsLoading,users:students,reload}}/>
        </div>
        <div className=" space-y-3">
            <p>current modules</p>
            <div className=" min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 ">
                <ul>
                    {availableModules.map((module,index)=>{
                    return <li key ={`${module}-${index}`} className="flex items-center gap-2">
                        <div className="flex-grow">{module}</div>
                        <Button variant={"ghost"} className="p-0" onClick={()=>handleRemoveModule(module)}><X color="red"/></Button>
                        </li>
                    })}
                </ul>
            </div>
            <p>modules to add</p>
            <div className=" min-h-[40px] w-full rounded-md border border-input bg-transparent px-3 py-2 ">
                <ul>
                    {modulesToAdd.map((module,index)=>{
                    return <li key ={`${module}-${index}`} className="flex items-center gap-2">
                    <div className="flex-grow">{module}</div>
                    <Button variant={"ghost"} className="p-0" onClick={()=>handleAddModule(module)}><Check color="green"/></Button>
                    </li>
                    })}
                </ul>
            </div>
            <div className="flex justify-end">
                <Button disabled={isLoading||disableSave} onClick={handleSaveModules}>{isLoading?"loading...":"Save module changes"}</Button>
            </div>
            </div>
        </div>
      </>:null}
      {
      data?.class_id?
      <div className="flex justify-end w-full my-8">
        <DeleteClass {...{students,teachers,handleChangeClass,isLoading,setIsLoading,classId:data.class_id}}/>
      </div>:null
      }
    </div>
    </>
  );
};

export default ManageClass;
