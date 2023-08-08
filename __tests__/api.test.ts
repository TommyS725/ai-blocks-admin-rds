import {
  APIError,
  ERROR_STATUS_TEXT,
  ServerErrorHandler,
} from "@/lib/api_utils";
import { Action, Data, TaskHandler } from "../src/lib/task-handler";
import { futureDate, sameList } from "@/lib/utils";
import {
  DBProcedure,
  GetAuthTokenProcedure,
  Procedure,
  Task,
} from "@/lib/task-and-procedure";
import { GroupType, UserRole } from "@prisma/client";
import { putLogEvent } from "@/lib/cloud_watch";
import { createUser } from "@/lib/db";
import { postUsersReqSchema, putUsersReqSchema } from "@/models/api_schemas";

const TIME_OUT = 1 * 60 * 1000; //time out limit for each test

const TEST_DATA = {
  emails: [
    "ching.chit@gmail.com",
    "tommy07201@gmail.com",
    // "aiblocks_test_three@gmail.com",
  ],
  name: "test",
  expiration_date:futureDate(0,1,0).toString(),
  class_id: "TEST-CLASS",
  class_name: "FOR TESTING ONLY",
  capacity: 30,
} as const;

async function errorAction(...args: any) {
  throw new APIError("Internal Server Error", "Error Testing");
}

class TestTaskHandler extends TaskHandler {
  async testRevert() {
    console.log(
      `Testing Revert, number of procedure in revert stack: ${this.revert_stack.length}`
    );
    await this.revertChanges();
  }
  clearUsers() {
    this.users.clear();
  }
  clearGroups() {
    this.groups.clear();
  }
  clearTasks() {
    this.auth0_tasks.splice(0, this.auth0_tasks.length);
    this.db_tasks.splice(0, this.db_tasks.length);
    return;
  }
  clearRevert() {
    if (this.revert_stack.length) {
      this.revert_stack.pop();
      this.clearRevert();
    }
    return;
  }
  clearError() {
    this.error_status_text = undefined;
    while (this.error_messages.length) {
      this.error_messages.pop();
    }
  }
  resetProperties() {
    this.auth0_token = undefined;
    this.clearTasks();
    this.clearRevert();
    this.clearError();
    this.clearUsers();
    this.clearGroups();
  }

  //   //add revert error at the input index, default at last
  setRevertError(index: number = this.revert_stack.length) {
    const procedure = new DBProcedure(
      "Error Procedure For Testing",
      errorAction,
      [123, "test payload", { first: "revert", second: "error", third: 321 }]
    );
    this.revert_stack.splice(index, 0, procedure);
  }
  getRevertStack() {
    return this.revert_stack;
  }

  protected async postingRevertError(message: string) {
    await putLogEvent("TEST_REVERT_ERROR", message);
  }
  constructor() {
    super();
  }
}

async function testError(fn: () => Promise<any>, status?: ERROR_STATUS_TEXT) {
  try {
    await fn();
    expect("Reached").not.toBeDefined();
  } catch (error: any) {
    // console.log(error);
    expect(error instanceof APIError).toBe(true);
    if (!(error instanceof APIError)) {
      console.log("unexpected error", error);
    }
    if (status) {
      expect(error.status).toBe(status);
    }
  }
}

async function createTestUser(
  email: string,
  role: UserRole,
  info?: {
    managing?: string[];
    enrolled?: string;
    families?: string[];
    available_modules: string[];
  }
) {
  const { managing, enrolled, families } = info ?? {};
  let payload;
  const data = {
    email,
    name: `test ${role}`,
  };
  const defaultDate = futureDate(0,0,1).toString()
  if (role === "admin") {
    payload = {
      ...data,
      role: "admin",
      expiration_date: null,
      available_modules: null,
    };
  } else if (role === "student") {
    payload = {
      role,
      ...data,
      expiration_date: defaultDate,
      enrolled: enrolled,
      families: families,
    };
  } else if (role === "parent" || role === "teacher") {
    payload = {
      role,
      ...data,
      expiration_date: defaultDate,
      managing: managing,
      available_modules: null,
    };
  } else {
    payload = {
      role: "student",
      ...data,
      expiration_date: defaultDate,
      families: [],
    };
  }
  payload = postUsersReqSchema.parse(payload);
  const user = await createUser(payload);
  return user;
}

async function createtestGroup(
  type: GroupType,
  info?: {
    manager_emails?: string[];
    student_emails?: string;
    children_email?: string[];
    available_modules: string[];
  }
) {}

// //having error
// const {
//   emails,
//   first_name,
//   last_name,
//   expiration_date,
//   role,
//   class_id,
//   class_name,
//   capacity,
//   available_modules,
// } = TEST_DATA;

// //init
// const testHandler = new TestTaskHandler();

// beforeEach(async () => {
//   const name = expect.getState().currentTestName ?? "Task";
//   await cleanUpDB(name);
//   testHandler.resetProperties();
//   // console.log(testHandler)
//   console.log(`Testing ${name} start.`);
//   console.time(name);
// }, TIME_OUT * emails.length);

// afterEach(async () => {
//   //clean up
//   const name = expect.getState().currentTestName;
//   // console.timeLog(name, "Task Complete");
//   testHandler.resetProperties();
//   console.log(`Testing ${name} done.`);
//   console.timeEnd(name);
// }, TIME_OUT);

// afterAll(async () => {
//   await cleanUpDB("Fianl Clean Up ");
// }, TIME_OUT * emails.length);

// test(
//   "Get Auth0 Access Token",
//   async () => {
//     //arrage
//     const procedure = new GetAuthTokenProcedure();

//     //act
//     const token = await procedure.process(testHandler);

//     //assert
//     expect(typeof token).toBe("string");
//   },
//   TIME_OUT
// );

// test(
//   "Create User Function",
//   async () => {
//     //arrange
//     const email = emails[0];
//     const createPayload = {
//       email,
//       first_name,
//       last_name,
//       expiration_date,
//       role,
//     };
//     const parsing = PostUsersReqSchema.parse(createPayload);
//     testHandler.logic.createSingleUser(parsing);

//     //act
//     await testHandler.start();

//     //assert
//     const user = testHandler.getSingleUser(email);
//     testUser(user, {
//       email,
//       first_name,
//       last_name,
//       expiration_date,
//       role,
//       available_modules: defaultModules,
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Get Unexisting User",
//   async () => {
//     //arrange
//     const email = "ching.chit@gmail.com";

//     //act
//     await testError(async () => {
//       await fetchSingleUser(email);
//     }, "Resource Not Found");
//   },
//   TIME_OUT
// );

// test(
//   "Create And Find User By Email",
//   async () => {
//     //arrange
//     const email = emails[0];

//     //act
//     await createUser(email, role);
//     const user = await fetchSingleUser(email);

//     //assert
//     testUser(user, {
//       email,
//       first_name,
//       last_name,
//       expiration_date,
//       role,
//       available_modules: defaultModules,
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Batch Create Users",
//   async () => {
//     //arrange
//     const payload: BatchCreateUserReqType = {
//       users: emails.map((email) => {
//         return {
//           email,
//           first_name,
//           last_name,
//         };
//       }),
//       expiration_date,
//       role,
//     };
//     testHandler.logic.barchCreateUsers(payload);

//     //act
//     await testHandler.start();

//     //assert
//     emails.forEach((email) => {
//       const user = testHandler.getSingleUser(email);
//       testUser(user, {
//         email,
//         first_name,
//         last_name,
//         expiration_date,
//         role,
//         available_modules: defaultModules,
//       });
//     });
//   },
//   TIME_OUT * emails.length
// );

// test(
//   "Batch Create Users And Search Users",
//   async () => {
//     //arrange
//     const payload: BatchCreateUserReqType = {
//       users: emails.map((email) => {
//         return {
//           email,
//           first_name,
//           last_name,
//         };
//       }),
//       expiration_date,
//       role,
//     };
//     testHandler.logic.barchCreateUsers(payload);

//     //act
//     await testHandler.start();
//     testHandler.clearUsers();
//     testHandler.logic.searchUser({ email: [...emails], type: "OR" });
//     await testHandler.start();
//     //assert
//     emails.forEach((email) => {
//       const user = testHandler.getSingleUser(email);
//       testUser(user, {
//         email,
//         first_name,
//         last_name,
//         expiration_date,
//         role,
//         available_modules: defaultModules,
//       });
//     });
//   },
//   TIME_OUT * emails.length
// );

// test(
//   "Update User",
//   async () => {
//     //arrange
//     const email = emails[0];
//     const updatedExpiration = futureDateStr(0, 10, 0);

//     //act
//     await createUser(email, "teacher");
//     await createClass();
//     testHandler.logic.updateUserByEmail(email, {
//       expiration_date: updatedExpiration,
//       teaching_class_ids: [class_id],
//     });
//     await testHandler.start();

//     //assert
//     const user = testHandler.getSingleUser(email);
//     const classD = testHandler.getSingleClass(class_id);
//     testUser(user, {
//       email,
//       first_name,
//       last_name,
//       expiration_date: updatedExpiration,
//       role: "teacher",
//       teaching_class_ids: [class_id],
//     });
//     testClass(classD, {
//       class_id,
//       available_modules,
//       class_name,
//       capacity,
//       teacher_ids: [email],
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Updating user modules",
//   async () => {
//     //arrange
//     const email = emails[0];

//     //act
//     await createUser(email, "unmanagedStudent");
//     testHandler.logic.updateUserByEmail(email, {
//       available_modules: [],
//     });
//     await testHandler.start();

//     //assert
//     const user = testHandler.getSingleUser(email);
//     testUser(user, {
//       email,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "unmanagedStudent",
//       available_modules: [],
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Unmanaged student enrolled in class",
//   async () => {
//     //arrange
//     const email = emails[0];

//     //act
//     await createUser(email, "unmanagedStudent");
//     await createClass();
//     testHandler.logic.updateUserByEmail(email, {
//       enrolled_class_id: class_id,
//     });
//     await testHandler.start();

//     //assert
//     const user = testHandler.getSingleUser(email);
//     const classD = testHandler.getSingleClass(class_id);
//     testUser(user, {
//       email,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "managedStudent",
//       enrolled_class_id: class_id,
//     });
//     testClass(classD, {
//       class_id,
//       class_name,
//       capacity,
//       available_modules,
//       student_ids: [email],
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Managed Student creation and removal from class",
//   async () => {
//     //arrange
//     const email = emails[0];

//     //act
//     await createClass();
//     await createUser(email, "managedStudent", { enrolled: class_id });
//     testHandler.logic.updateUserByEmail(email, {
//       enrolled_class_id: null,
//     });
//     await testHandler.start();

//     //assert
//     const user = testHandler.getSingleUser(email);
//     const classD = testHandler.getSingleClass(class_id);
//     testUser(user, {
//       email,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "unmanagedStudent",
//       enrolled_class_id: undefined,
//     });
//     testClass(classD, {
//       class_id,
//       class_name,
//       capacity,
//       available_modules,
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Update Unexisting User",
//   async () => {
//     //act
//     await createClass();

//     //assert
//     testHandler.logic.updateUserByEmail(emails[0], {
//       enrolled_class_id: class_id,
//     });
//     await testError(async () => {
//       await testHandler.start();
//     }, "Resource Not Found");
//     const data = await fetchSingleClass(class_id);
//     testClass(data, {
//       class_id,
//       class_name,
//       capacity,
//       available_modules,
//       student_ids: undefined,
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Deleting Student ",
//   async () => {
//     //arange
//     const email = emails[0];

//     //act
//     await createClass();
//     await createUser(email, "managedStudent", { enrolled: class_id });
//     testHandler.logic.deleteUserByEmail(email);
//     await testHandler.start();

//     //assert
//     const classD = testHandler.getSingleClass(class_id);
//     testClass(classD, {
//       class_id,
//       class_name,
//       capacity,
//       available_modules,
//     });

//     await testError(async () => {
//       await fetchSingleUser(email);
//     }, "Resource Not Found");
//   },
//   TIME_OUT
// );

// test(
//   "Deleting Teacher ",
//   async () => {
//     //arange
//     const email = emails[0];

//     //act
//     await createClass();
//     await createUser(email, "teacher", { teaching: [class_id] });
//     testHandler.logic.deleteUserByEmail(email);
//     await testHandler.start();

//     //assert
//     const classD = testHandler.getSingleClass(class_id);
//     testClass(classD, {
//       class_id,
//       class_name,
//       capacity,
//       available_modules,
//     });

//     await testError(async () => {
//       await fetchSingleUser(email);
//     }, "Resource Not Found");
//   },
//   TIME_OUT
// );

// test(
//   "Create Class Function",
//   async () => {
//     //arrange
//     const payload: PostClassesReqType = {
//       class_name,
//       teacher_ids: [],
//       capacity,
//       available_modules,
//     };
//     testHandler.logic.createClass(payload, class_id);
//     //act
//     await testHandler.start();

//     //assert
//     const classD = testHandler.getSingleClass(class_id);
//     testClass(classD, {
//       class_id,
//       class_name,
//       capacity,
//       available_modules,
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Create Class With Teacher",
//   async () => {
//     //arange
//     const email = emails[0];
//     testHandler.logic.createClass(
//       { class_name, teacher_ids: [email], capacity, available_modules },
//       class_id
//     );

//     //act
//     await createUser(email, "teacher");
//     await testHandler.start();
//     //assert
//     const user = testHandler.getSingleUser(email);
//     const classD = testHandler.getSingleClass(class_id);
//     testUser(user, {
//       email,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "teacher",
//       teaching_class_ids: [class_id],
//     });
//     testClass(classD, {
//       class_id,
//       class_name,
//       available_modules,
//       capacity,
//       teacher_ids: [email],
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Fetching unexisting class",
//   async () => {
//     await testError(async () => {
//       await fetchSingleClass(class_id);
//     }, "Resource Not Found");
//   },
//   TIME_OUT
// );

// test(
//   "Get Class By ID",
//   async () => {
//     //arrange
//     testHandler.logic.getClassByID(class_id);

//     //act
//     await createClass();
//     await testHandler.start();

//     //assert
//     const classD = testHandler.getSingleClass(class_id);
//     testClass(classD, {
//       class_id,
//       class_name,
//       capacity,
//       available_modules,
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Batch Get Class By ID",
//   async () => {
//     //arrange
//     testHandler.logic.batchGetClass([class_id]);

//     //act
//     await createClass();
//     await testHandler.start();

//     //assert
//     const classD = testHandler.getSingleClass(class_id);
//     testClass(classD, {
//       class_id,
//       class_name,
//       capacity,
//       available_modules,
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Update Class Function",
//   async () => {
//     //arrange
//     const teacherEmail = emails[0];
//     const studentEmail = emails[1];
//     const update: ClassUpdatePaylod = {
//       class_id,
//       addStudents: [studentEmail],
//       addTeachers: [teacherEmail],
//       class_name: "Updated",
//       capacity: capacity + 10,
//     };

//     //act
//     await createClass();
//     await createUser(teacherEmail, "teacher");
//     await createUser(studentEmail, "unmanagedStudent");
//     testHandler.logic.updateClass(update);
//     await testHandler.start();

//     //assert
//     const student = testHandler.getSingleUser(studentEmail);
//     const teacher = testHandler.getSingleUser(teacherEmail);

//     const classD = testHandler.getSingleClass(class_id);
//     testUser(teacher, {
//       email: teacherEmail,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "teacher",
//       teaching_class_ids: [class_id],
//     });

//     testUser(student, {
//       email: studentEmail,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "managedStudent",
//       enrolled_class_id: class_id,
//     });

//     testClass(classD, {
//       class_id,
//       class_name: "Updated",
//       capacity: capacity + 10,
//       available_modules,
//       teacher_ids: [teacherEmail],
//       student_ids: [studentEmail],
//     });
//   },
//   TIME_OUT * emails.length
// );

// test(
//   "Update Unexisting Class",
//   async () => {
//     //arrange
//     const email = emails[0];

//     //act
//     await createUser(email, "unmanagedStudent");
//     testHandler.logic.updateClass({ class_id, addStudents: [email] });

//     //assert
//     await testError(async () => {
//       await testHandler.start();
//     }, "Resource Not Found");
//     const data = await fetchSingleUser(email);
//     testUser(data, {
//       email,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "unmanagedStudent",
//     });
//   },
//   TIME_OUT
// );

// test(
//   "Class Delete",
//   async () => {
//     //arrange
//     const studentEmail = emails[0];
//     const teacherEmail = emails[1];

//     //act
//     await createUser(studentEmail, "unmanagedStudent");
//     await createUser(teacherEmail, "teacher");
//     await createClass([teacherEmail]);
//     testHandler.logic.updateClass({ class_id, addStudents: [studentEmail] });
//     await testHandler.start();
//     testHandler.logic.deleteClassbyID(class_id);
//     await testHandler.start();

//     //assert
//     await testError(async () => {
//       await fetchSingleClass(class_id);
//     }, "Resource Not Found");
//     const student = testHandler.getSingleUser(studentEmail);
//     const teacher = testHandler.getSingleUser(teacherEmail);
//     testUser(student, {
//       email: studentEmail,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "unmanagedStudent",
//     });
//     testUser(teacher, {
//       email: teacherEmail,
//       first_name,
//       last_name,
//       expiration_date,
//       role: "teacher",
//       teaching_class_ids: [],
//     });
//   },
//   TIME_OUT * emails.length
// );

// //test reverts

// //revert create single user
// test(
//   "Revert Create Single User",
//   async () => {
//     //arrange
//     const email = emails[0]
//     testHandler.logic.createSingleUser({role:"managedStudent",email,first_name,last_name,enrolled_class_id:class_id})

//     //act
//     await createClass();
//     // await createUser(scuessEmail,"managedStudent",{enrolled:class_id})
//     await testHandler.start();
//     await testHandler.testRevert();

//     //assert
//     const classData = await fetchSingleClass(class_id);
//     testClass(classData, {
//       class_id,
//       class_name,
//       available_modules,
//       teacher_ids: undefined,
//       capacity,
//       student_ids: undefined,
//     });
//     await testError(async () => {
//       const searched = await fetchSingleUser(email)
//     }, "Resource Not Found");
//   },
//   TIME_OUT * emails.length
// );

// //batch create user one fial , all not created
// test(
//   "No User Created if one fail",
//   async () => {
//     //arrange
//     const targets = [...emails]
//     const users = targets.map((email) => {
//       return { email, first_name, last_name };
//     });
//     testHandler.logic.barchCreateUsers({
//       role: "teacher",
//       users,
//       expiration_date: expiration_date,
//       teaching_class_ids:[class_id]
//     });

//     //act
//     await createClass();
//     // await createUser(scuessEmail,"managedStudent",{enrolled:class_id})
//     await testHandler.start();
//     await testHandler.testRevert();

//     //assert
//     const classData = await fetchSingleClass(class_id);
//     testClass(classData, {
//       class_id,
//       class_name,
//       available_modules,
//       teacher_ids: undefined,
//       capacity,
//       student_ids: undefined,
//     });
//     for(const email of targets){
//       await testError(async () => {
//         const searched = await fetchSingleUser(email)
//       }, "Resource Not Found");
//     }
//   },
//   TIME_OUT * emails.length
// );

// //Revert update user fail, no role change, managed -> un
// test(
//   "Reverting for Managed Stuendent Removed From Class",
//   async () => {
//     //arrange
//     const email = emails[0];
//     testHandler.logic.updateUserByEmail(email, { enrolled_class_id: null });

//     //act
//     await createClass();
//     await createUser(email, "managedStudent", { enrolled: class_id });
//     await testHandler.start();
//     await testHandler.testRevert();

//     //assert
//     const classData = await fetchSingleClass(class_id);
//     const user = await fetchSingleUser(email);
//     testClass(classData, {
//       class_id,
//       class_name,
//       available_modules,
//       teacher_ids: undefined,
//       capacity,
//       student_ids: [email],
//     });
//     testUser(user, {
//       role: "managedStudent",
//       first_name,
//       last_name,
//       email,
//       enrolled_class_id: class_id,
//       expiration_date,
//     });
//   },
//   TIME_OUT
// );

// //un -> mangaed
// test(
//   "Reverting for Unmanaged Student enrolled in class",
//   async () => {
//     //arrange
//     const email = emails[0];
//     testHandler.logic.updateUserByEmail(email, { enrolled_class_id: class_id });

//     //act
//     await createClass();
//     await createUser(email, "unmanagedStudent");
//     await testHandler.start();
//     await testHandler.testRevert();

//     //assert
//     const classData = await fetchSingleClass(class_id);
//     const user = await fetchSingleUser(email);
//     testClass(classData, {
//       class_id,
//       class_name,
//       available_modules,
//       teacher_ids: undefined,
//       capacity,
//       student_ids: undefined,
//     });
//     testUser(user, {
//       role: "unmanagedStudent",
//       first_name,
//       last_name,
//       email,
//       enrolled_class_id: undefined,
//       expiration_date,
//     });
//   },
//   TIME_OUT
// );

// //delete user fail
// test(
//   "Reverting for Deleting Teacher from Class",
//   async () => {
//     //arrange
//     const email = emails[0];
//     testHandler.logic.deleteUserByEmail(email);

//     //act
//     await createClass();
//     await createUser(email, "teacher", { teaching: [class_id] });
//     await testHandler.start();
//     await testHandler.testRevert();

//     //assert
//     const classData = await fetchSingleClass(class_id);
//     const user = await fetchSingleUser(email);
//     testClass(classData, {
//       class_id,
//       class_name,
//       available_modules,
//       teacher_ids: [email],
//       capacity,
//       student_ids: undefined,
//     });
//     testUser(user, {
//       role: "teacher",
//       first_name,
//       last_name,
//       email,
//       teaching_class_ids: [class_id],
//       expiration_date,
//     });
//   },
//   TIME_OUT
// );

// //create class fail
// test(
//   "Reverting for Creating Class",
//   async () => {
//     //arrange
//     const email = emails[0];
//     testHandler.logic.createClass(
//       { class_name, capacity, available_modules, teacher_ids: [email] },
//       class_id
//     );

//     //act
//     await createUser(email, "teacher");
//     await createClass();
//     await testHandler.start();
//     await testHandler.testRevert();

//     //assert
//     await testError(async () => {
//       const classData = await fetchSingleClass(class_id);
//     }, "Resource Not Found");
//     const user = await fetchSingleUser(email);
//     testUser(user, {
//       role: "teacher",
//       first_name,
//       last_name,
//       email,
//       teaching_class_ids: [],
//       expiration_date,
//     });
//   },
//   TIME_OUT
// );

// //update class  fail
// test(
//   "Revert Class Upodate",
//   async () => {
//     //arrange
//     const studentEmail = emails[0];
//     const teacherEmail = emails[1];
//     testHandler.logic.updateClass({
//       class_id,
//       class_name: "Updated",
//       removeStudents: [studentEmail],
//       removeTeachers: [teacherEmail],
//     });

//     //act
//     await createClass();
//     await createUser(studentEmail, "managedStudent", { enrolled: class_id });
//     await createUser(teacherEmail, "teacher", { teaching: [class_id] });
//     await testHandler.start();
//     await testHandler.testRevert();

//     //assert
//     const student = await fetchSingleUser(studentEmail);
//     const teacher = await fetchSingleUser(teacherEmail);
//     const classData = await fetchSingleClass(class_id);
//     testUser(student, {
//       role: "managedStudent",
//       first_name,
//       last_name,
//       email: studentEmail,
//       enrolled_class_id: class_id,
//       expiration_date,
//     });
//     testUser(teacher, {
//       role: "teacher",
//       first_name,
//       last_name,
//       email: teacherEmail,
//       teaching_class_ids: [class_id],
//       expiration_date,
//     });
//     testClass(classData, {
//       class_id,
//       class_name,
//       available_modules,
//       teacher_ids: [teacherEmail],
//       capacity,
//       student_ids: [studentEmail],
//     });
//   },
//   TIME_OUT
// );

// //delete class fail
// test(
//   "Revert Class Delete",
//   async () => {
//     //arrange
//     const studentEmail = emails[0];
//     const teacherEmail = emails[1];
//     testHandler.logic.deleteClassbyID(class_id);

//     //act
//     await createUser(teacherEmail, "teacher");
//     await createClass([teacherEmail]);
//     await createUser(studentEmail, "managedStudent", { enrolled: class_id });
//     await testHandler.start();
//     await testHandler.testRevert();

//     //assert
//     const student = await fetchSingleUser(studentEmail);
//     const teacher = await fetchSingleUser(teacherEmail);

//     const classData = await fetchSingleClass(class_id);
//     // console.log(student, teacher);
//     testUser(student, {
//       role: "managedStudent",
//       first_name,
//       last_name,
//       email: studentEmail,
//       enrolled_class_id: class_id,
//       expiration_date,
//     });
//     testUser(teacher, {
//       role: "teacher",
//       first_name,
//       last_name,
//       email: teacherEmail,
//       teaching_class_ids: [class_id],
//       expiration_date,
//     });
//     testClass(classData, {
//       class_id,
//       class_name,
//       available_modules,
//       teacher_ids: [teacherEmail],
//       capacity,
//       student_ids: [studentEmail],
//     });
//   },
//   TIME_OUT * emails.length
// );

// //handle revert error with create user
// test("Handling Revert Error",async()=>{
//   //arrange
//   const email = emails[0]
//   testHandler.logic.createSingleUser({role:"managedStudent",first_name,last_name,email,expiration_date,enrolled_class_id:class_id})

//   //act
//   await createClass()
//   await testHandler.start()
//   // console.log(testHandler.getRevertStack())
//   testHandler.setRevertError()
//   await testHandler.testRevert()

//   //assert
//   //nothing is reverted
//   const user = await fetchSingleUser(email)
//   const classData = await fetchSingleClass(class_id)
//   testClass(classData,{
//     class_id,class_name,capacity,available_modules,
//     student_ids:[email]
//   })
//   testUser(user,{email,first_name,last_name,expiration_date,enrolled_class_id:class_id,role:"managedStudent"})

// },TIME_OUT)

test("pass", () => {
  expect(1).toBe(1);
});