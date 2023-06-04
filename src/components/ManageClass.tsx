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
import { Label } from "./ui/label";

import { cn } from "@/lib/utils"
import { RoledUserArraySchema, RoledUserArrayType, RoledUserType ,modulesReady} from "@/models/auth0_schemas";



const formSchema = z.object({
  userId: z.string().trim().email().nonempty(),
});

interface Props {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  classId:string
  handleChangeClassId :(id:string)=>Promise<void>
}

const SearchTeacher: FC<Props> = ({ isLoading,setIsLoading,classId,handleChangeClassId}) => {
    const [teacher,setTeacher] = useState<RoledUserType | undefined>();
    const [open, setOpen] = useState<boolean>(false)
    const teaching =teacher?.user_metadata?.teaching_class_ids??[]


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
    },
  });
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setTeacher(undefined);
    await handleChangeClassId("")
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
      console.log(error?.response?.data?.message ?? error?.message ?? error);
    }
    setIsLoading(false);
  };

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
                        ? classId
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
                                await handleChangeClassId(currentValue === classId ? "" : currentValue)
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
        </div>
        </>:null
      }
    </>
  );
};


const InputClassID:FC<Props> = ({ isLoading,setIsLoading,classId,handleChangeClassId})=>{
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
        await handleChangeClassId(input)
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


const ManageClass: FC = () => {
  const [classId,setClassId] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [students,setStudents] = useState<RoledUserArrayType>([])

  let currentModules:string[] =[]
  const [availableModules,setAvailableModules] = useState<string[]>([])
  const modulesToAdd:string[] = modulesReady.filter(module=>!availableModules.includes(module))
  const disableSave:boolean = currentModules.toString()===availableModules.toString()


  const handleChangeClassId =async (id:string):Promise<void> => {
    setStudents([])
    currentModules=[]
    setAvailableModules(currentModules)
    setClassId("")
    if(!id.length){
        return
    }
    setIsLoading(true)
    try {
        //todo: ftech db for modules
        //current modules = data.sort()
        //setAvaibleModules(currentModules)

        const response = await axios.get(
          `/api/users?enrolled_class_id=${id}`
        );
        const data = RoledUserArraySchema.parse(response.data);
        // console.log(data)
        setStudents(data)
        setClassId(id)
      } catch (error: any) {
        console.log(error?.response?.data?.message ?? error?.message ?? error);
    }
    setIsLoading(false)
    return
  }
  
  const handleAddModule = (toAdd:string)=>{
    setAvailableModules(prev=>[...prev,toAdd].sort())
  }
  const handleRemoveModule = (toRemove:string)=>{
    setAvailableModules(prev=>prev.filter(module=>module!==toRemove).sort())
  }
  const handleSaveModules = async ()=>{
    setIsLoading(true)
    try {
        //ftech server
        const payload = {
            classId,
            available_modules:availableModules
        }
        console.log(payload)
    } catch (error:any) {
    console.log(error?.response?.data?.message ?? error?.message ?? error);
    }
    setIsLoading(false)
    await handleChangeClassId(classId)
  }
  

  return (
    <>
    <div className="m-8">
    <Tabs defaultValue="teacher" className="">
    <div className="flex justify-center">
      <TabsList className="">
        <TabsTrigger value="teacher">By teacher</TabsTrigger>
        <TabsTrigger value="classId">By class ID</TabsTrigger>
      </TabsList>
    </div>
      <TabsContent value="teacher">
        <SearchTeacher {...{isLoading,setIsLoading,handleChangeClassId,classId} }/>
        </TabsContent>
        <TabsContent value="classId">
        <InputClassID {...{isLoading,setIsLoading,handleChangeClassId,classId} }/>
        </TabsContent>
      </Tabs>
      {classId?<>
      <div className="grid grid-cols-2 gap-6">
        <div className=" space-y-3">
            <p>Students</p>
            <div className=" min-h-[350px] w-full rounded-md border border-input bg-transparent px-3 py-2 ">
                <ul>
                    {students.map((student,index)=>{
                    return <li key ={`${module}-${index}`} className="flex items-center gap-2">
                        <div className="flex-grow ">
                            <span>{`${index+1}.`}</span>
                            <span className="mx-4">{student.name}</span>
                            <span>{student.email}</span>
                            </div>
                        </li>
                    })}
                </ul>
            </div>
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
    </div>
    </>
  );
};

export default ManageClass;
