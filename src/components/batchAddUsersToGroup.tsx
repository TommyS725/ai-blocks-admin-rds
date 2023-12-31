import { GroupType, UserRole } from "@prisma/client";
import {
  FC,
  Dispatch,
  SetStateAction,
  useId,
} from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "./ui/use-toast";
import { ClientErrorHandler, hasIntersection } from "@/lib/utils";
import { requestAPI } from "@/lib/request";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "./ui/input";

import { Button } from "./ui/button";

import { User, Group } from "@/models/db_schemas";
import {
  APIRoute,
  postBatchEnrollsResSchema,
  postBatchFamiliesResSchema,
  postBatchManagesResSchema,
} from "@/models/api_schemas";

interface props {
  users: User[];
  group_id: string;
  type: GroupType;
  role: UserRole;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  handleChangeGroup: (data: Group | undefined) => Promise<void>;
}

const formSchema = z.object({
  emails_str: z
    .string()
    .trim()
    .refine(
      (input) => {
        const idList = input
          .split(",")
          .filter((id) => id.length)
          .map((id) => id.trim());
        for (const id of idList) {
          if (!z.string().email().safeParse(id).success) {
            return false;
          }
        }
        return true;
      },
      {
        message: `Invalid email, please provide a list of email seperated by ","`,
      }
    ),
});

const BatchAddUsersToGroup: FC<props> = (props) => {
  const {
    group_id,
    role,
    handleChangeGroup,
    isLoading,
    setIsLoading,
    type,
    users,
  } = props;
  const { toast } = useToast();
  const inputId = useId();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emails_str: "",
    },
  });
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const emails = values.emails_str
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length);
    if (!emails.length) {
      form.setError("emails_str", { message: "Empty list of emails" });
      return;
    }
    if (
      hasIntersection(
        emails,
        users.map((u) => u.email)
      )
    ) {
      form.setError("emails_str", {
        message: `Some ${role}s are already in this ${type}`,
      });
      return;
    }
    setIsLoading(true);
    try {
      const checkuUsers = await requestAPI(
        "users",
        "GET",
        { email: emails, roles: [role] },
        {}
      );
    } catch (error) {
      const handler = new ClientErrorHandler(error);
      if (handler.isAxiosError && handler.status_code === 404) {
        console.log("...");
        form.setError("emails_str", {
          message: handler.message.split(":")[2],
        });
        setIsLoading(false);
        return;
      }
      handler.log();
      toast({
        title: "Search error",
        description: handler.message,
      });
      setIsLoading(false);
      return;
    }
    try {
      const payload = {
        emails,
        group_id,
      };
      if (role === "parent" && type === "family") {
        const response = await requestAPI("batch-manages", "POST", {}, payload);
        toast({
          title: "Updated",
        });
        const data = postBatchManagesResSchema.parse(response);
        await handleChangeGroup(data);
      } else if (role === "teacher" && type == "class") {
        const response = await requestAPI("batch-manages", "POST", {}, payload);
        toast({
          title: "Updated",
        });
        const data = postBatchManagesResSchema.parse(response);
        await handleChangeGroup(data);
      } else if (role === "student" && type === "class") {
        const response = await requestAPI("batch-enrolls", "POST", {}, payload);
        toast({
          title: "Updated",
        });
        const data = postBatchEnrollsResSchema.parse(response);
        await handleChangeGroup(data);
      } else if (role === "student" && type == "family") {
        const response = await requestAPI(
          "batch-families",
          "POST",
          {},
          payload
        );
        toast({
          title: "Updated",
        });
        const data = postBatchFamiliesResSchema.parse(response);
        await handleChangeGroup(data);
      } else {
        throw new Error("Unmatch on user role and group type ");
      }
    } catch (error: any) {
      const handler = new ClientErrorHandler(error);
      handler.log();
      toast({
        variant: "destructive",
        title: "Create Module Error",
        description: handler.message,
      });
    }
    setIsLoading(false);
  };

  const disableSave = !form.watch("emails_str").length;

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button disabled={isLoading} variant={"default"} className="">
            {isLoading ? "loading..." : `Add ${role}s`}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add {role}s</DialogTitle>
            <DialogDescription>
              Add {role}s to {type}. Click save when you are done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="emails_str"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={inputId}>Emails</FormLabel>
                    <Input id={inputId} {...field} type="text"></Input>
                    <FormDescription>{`Seperate ${role}s emails by "," `}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <FormControl>
                  <Button type="submit" disabled={isLoading || disableSave}>
                    {isLoading ? "Loading..." : "Add"}
                  </Button>
                </FormControl>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BatchAddUsersToGroup;
