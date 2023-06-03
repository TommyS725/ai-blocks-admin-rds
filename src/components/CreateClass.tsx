import { FC,useState } from "react"
import { X,Check } from "lucide-react";
import {z} from "zod"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import { Input } from "./ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { defaultModels,modulesReady } from "@/models/auth0_schemas"
import { CreateClassDataType } from "@/models/api_schemas";

const FormSchema = z.object({
    teacherId:z.string().email().trim().nonempty(),
    capacity:z.string().nonempty({message:"Required"})
})

const CreateClass:FC= ()=>{
    const [isLoading,setIsLoading] = useState<boolean>(false)
    const [availableModules,setAvailableModules] = useState<string[]>(defaultModels.sort())
    const modulesToAdd:string[] = modulesReady.filter(module=>!availableModules.includes(module))

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
          teacherId:"",
          capacity:"10"
        },
      });

    const onSubmit = async (values: z.infer<typeof FormSchema>)=>{
        setIsLoading(true)
        try { 
            // console.log(values,availableModules)
            let {teacherId,capacity} = values
            if(isNaN(Number(capacity))){
                form.setError("capacity",{message:"Invalid number"})
                setIsLoading(false)
                return
            }
            const payload:CreateClassDataType={
                teacherId:values.teacherId,
                capacity:Number(values.capacity),
                available_modules:availableModules||[]
            }
            console.log(payload)
        } catch (error: any) {
            console.log(error?.response?.data?.messages??error?.message??error)
          }
        setIsLoading(false)
    }

    const handleAddModule = (toAdd:string)=>{
      setAvailableModules(prev=>[...prev,toAdd].sort())
    }
    const handleRemoveModule = (toRemove:string)=>{
      setAvailableModules(prev=>prev.filter(module=>module!==toRemove).sort())
    }
   
    
    

    return <>
     <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className=" grid grid-cols-3  items-center gap-12"
        >
        <div className=" space-y-5 col-span-2">
          <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Teacher ID ..."
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <p>current modules</p>
                <div className=" min-h-[40px] w-full rounded-md border border-input bg-transparent px-3 py-2 ">
                    <ul>
                        {availableModules.map((module,index)=>{
                        return <li key ={`${module}-${index}`} className="flex items-center gap-2">
                            <div className="flex-grow">{module}</div>
                            <Button type="button" variant={"ghost"} className="p-0" onClick={()=>handleRemoveModule(module)}><X color="red"/></Button>
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
                        <Button type="button" variant={"ghost"} className="p-0" onClick={()=>handleAddModule(module)}><Check color="green"/></Button>
                        </li>
                        })}
                    </ul>
                </div>
            </div>
            <div className="items-center justify-center flex">
            <Button type="submit" disabled={isLoading}>{isLoading?"Loading...":"Create Class"}</Button>
            </div>
        </form>
      </Form>
    </>
  }

export default CreateClass