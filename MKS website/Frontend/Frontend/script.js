"use strict";

/*
=========================================================
MASTER'S KINDERGARTEN SCHOOL
LOCAL STORAGE + INDEXEDDB VERSION

IMPORTANT:
- Text/data -> localStorage
- Images -> IndexedDB
- This prevents QuotaExceededError
=========================================================
*/


/* =====================================================
   STORAGE
===================================================== */

const STORAGE_KEY = "MKS_SCHOOL_DATA";

let schoolData = {
    about:
        "Master's Kindergarten School is dedicated to excellent education, character building and confidence.",

    announcements: [],

    classes: {},

    resources: [],

    homePhotos: [],

    teachers: [],

    results: [],

    students: [],

    tests: [],

    submissions: [],

    inbox: [],

    admission: {
        allowed: true,
        testDate: "",
        testTime: ""
    },

    accounts: {
        principal: {
            username: "principal",
            password: "principal123"
        },

        staff: {
            username: "staff",
            password: "staff123"
        }
    }
};


/* =====================================================
   LOAD DATA
===================================================== */

function loadData(){

    try{

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if(saved){

            const parsed =
                JSON.parse(saved);

            schoolData = {
                ...schoolData,
                ...parsed,

                admission:{
                    ...schoolData.admission,
                    ...(parsed.admission || {})
                },

                accounts:{
                    ...schoolData.accounts,
                    ...(parsed.accounts || {})
                }
            };

        }

    }catch(error){

        console.error("Could not load data:", error);

    }

}


/* =====================================================
   SAVE DATA
===================================================== */

function saveData(){

    try{

        /*
        NEVER store image Base64 data here.
        Images are stored in IndexedDB.
        */

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(schoolData)
        );

    }catch(error){

        console.error(error);

        alert(
            "The browser storage is full. " +
            "Please remove some old data."
        );

    }

}


/* =====================================================
   HELPERS
===================================================== */

function id(){

    return (
        Date.now().toString(36) +
        Math.random().toString(36).substring(2)
    );

}


function escapeHTML(value){

    if(value === null || value === undefined){
        return "";
    }

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


function formatDate(date){

    try{

        return new Date(date).toLocaleString();

    }catch(e){

        return date;

    }

}


function getEl(elementId){

    return document.getElementById(elementId);

}


/* =====================================================
   INDEXEDDB PHOTO STORAGE
===================================================== */

const PHOTO_DB_NAME = "MKS_PHOTO_DATABASE";
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE = "photos";


function openPhotoDB(){

    return new Promise((resolve,reject)=>{

        const request =
            indexedDB.open(
                PHOTO_DB_NAME,
                PHOTO_DB_VERSION
            );

        request.onupgradeneeded = function(event){

            const db = event.target.result;

            if(!db.objectStoreNames.contains(PHOTO_STORE)){

                db.createObjectStore(
                    PHOTO_STORE,
                    {
                        keyPath:"id"
                    }
                );

            }

        };

        request.onsuccess = function(){

            resolve(request.result);

        };

        request.onerror = function(){

            reject(request.error);

        };

    });

}


async function savePhoto(file){

    if(!file){
        return null;
    }

    const db =
        await openPhotoDB();

    const photoId =
        id();

    return new Promise((resolve,reject)=>{

        const transaction =
            db.transaction(
                PHOTO_STORE,
                "readwrite"
            );

        const store =
            transaction.objectStore(
                PHOTO_STORE
            );

        const request =
            store.put({
                id:photoId,
                blob:file,
                name:file.name,
                type:file.type,
                createdAt:new Date().toISOString()
            });

        request.onsuccess = function(){

            resolve(photoId);

        };

        request.onerror = function(){

            reject(request.error);

        };

    });

}


async function getPhoto(photoId){

    if(!photoId){
        return null;
    }

    try{

        const db =
            await openPhotoDB();

        return new Promise((resolve,reject)=>{

            const transaction =
                db.transaction(
                    PHOTO_STORE,
                    "readonly"
                );

            const store =
                transaction.objectStore(
                    PHOTO_STORE
                );

            const request =
                store.get(photoId);

            request.onsuccess = function(){

                resolve(
                    request.result || null
                );

            };

            request.onerror = function(){

                reject(request.error);

            };

        });

    }catch(error){

        console.error(error);

        return null;

    }

}


async function deletePhoto(photoId){

    if(!photoId){
        return;
    }

    try{

        const db =
            await openPhotoDB();

        return new Promise((resolve,reject)=>{

            const transaction =
                db.transaction(
                    PHOTO_STORE,
                    "readwrite"
                );

            const store =
                transaction.objectStore(
                    PHOTO_STORE
                );

            const request =
                store.delete(photoId);

            request.onsuccess =
                () => resolve();

            request.onerror =
                () => reject(request.error);

        });

    }catch(error){

        console.error(error);

    }

}


async function photoURL(photoId){

    const record =
        await getPhoto(photoId);

    if(!record || !record.blob){
        return "";
    }

    return URL.createObjectURL(
        record.blob
    );

}


/* =====================================================
   PAGE NAVIGATION
===================================================== */

function setupTabs(){

    document
        .querySelectorAll(".tab")
        .forEach(button=>{

            button.addEventListener(
                "click",
                function(){

                    const pageId =
                        this.dataset.page;

                    document
                        .querySelectorAll(".tab")
                        .forEach(tab =>
                            tab.classList.remove(
                                "active"
                            )
                        );

                    this.classList.add("active");

                    document
                        .querySelectorAll(".page")
                        .forEach(page =>
                            page.classList.remove(
                                "active"
                            )
                        );

                    const page =
                        getEl(pageId);

                    if(page){

                        page.classList.add(
                            "active"
                        );

                    }

                    refreshAll();

                }
            );

        });

}


/* =====================================================
   HOME
===================================================== */

async function renderHome(){

    getEl("homeAbout").textContent =
        schoolData.about;

    getEl("aboutText").textContent =
        schoolData.about;


    const announcements =
        getEl("homeAnnouncements");

    if(!schoolData.announcements.length){

        announcements.innerHTML =
            `<div class="empty-message">
                No announcements.
             </div>`;

    }else{

        announcements.innerHTML =
            schoolData.announcements
                .slice()
                .reverse()
                .map(item=>`

                    <div class="item-card">

                        <h3>
                            ${escapeHTML(item.title)}
                        </h3>

                        <p>
                            ${escapeHTML(item.body)}
                        </p>

                        <small>
                            ${formatDate(item.date)}
                        </small>

                    </div>

                `)
                .join("");

    }


    const photoContainer =
        getEl("homePhotos");

    photoContainer.innerHTML = "";

    for(const photo of schoolData.homePhotos){

        const url =
            await photoURL(photo.photoId);

        if(!url){
            continue;
        }

        photoContainer.innerHTML += `

            <div class="photo-card">

                <img
                    src="${url}"
                    alt="School Photo"
                >

            </div>

        `;

    }

}


/* =====================================================
   CLASSES
===================================================== */

function renderClasses(){

    const container =
        getEl("classesList");

    const classes =
        Object.entries(
            schoolData.classes
        );

    if(!classes.length){

        container.innerHTML =
            `<div class="empty-message">
                No class information available.
             </div>`;

        return;
    }

    container.innerHTML =
        classes.map(([grade,data])=>`

            <div class="item-card">

                <h3>
                    ${escapeHTML(grade)}
                </h3>

                <p>
                    <strong>Teacher:</strong>
                    ${escapeHTML(data.teacher || "Not assigned")}
                </p>

                <p>
                    <strong>Subjects:</strong>
                    ${escapeHTML(data.subjects || "Not specified")}
                </p>

            </div>

        `).join("");

}


/* =====================================================
   TEACHERS
===================================================== */

async function renderTeachers(){

    const container =
        getEl("teachersList");

    if(!schoolData.teachers.length){

        container.innerHTML =
            `<div class="empty-message">
                No teachers added yet.
             </div>`;

        return;

    }

    container.innerHTML = "";

    for(const teacher of schoolData.teachers){

        const url =
            await photoURL(
                teacher.photoId
            );

        container.innerHTML += `

            <div class="item-card">

                ${
                    url
                    ?
                    `<img
                        class="account-photo"
                        src="${url}"
                        alt="Teacher"
                    >`
                    :
                    ""
                }

                <h3>
                    ${escapeHTML(teacher.name)}
                </h3>

                <p>
                    <strong>Subject:</strong>
                    ${escapeHTML(teacher.subject)}
                </p>

                <p>
                    ${escapeHTML(teacher.description)}
                </p>

            </div>

        `;

    }

}


/* =====================================================
   RESOURCES
===================================================== */

function renderResources(){

    const container =
        getEl("resourcesList");

    if(!schoolData.resources.length){

        container.innerHTML =
            `<div class="empty-message">
                No resources available.
             </div>`;

        return;

    }

    container.innerHTML =
        schoolData.resources.map(resource=>`

            <div class="item-card">

                <h3>
                    ${escapeHTML(resource.title)}
                </h3>

                <p>
                    ${escapeHTML(resource.content)}
                </p>

            </div>

        `).join("");

}


/* =====================================================
   ADMISSION STATUS
===================================================== */

function renderAdmissionStatus(){

    const status =
        getEl("admissionStatus");

    if(schoolData.admission.allowed){

        status.innerHTML =
            `<div class="status-box status-active">
                🟢 Admissions are currently open.
             </div>`;

    }else{

        status.innerHTML =
            `<div class="status-box status-suspended">
                🟡 Admissions are currently closed.
             </div>`;

    }


    const schedule =
        getEl("admissionTestSchedule");

    if(
        schoolData.admission.testDate &&
        schoolData.admission.testTime
    ){

        schedule.innerHTML =
            `<div class="success-box">

                <strong>
                    Admission Test Schedule
                </strong>

                <br>

                Date:
                ${escapeHTML(
                    schoolData.admission.testDate
                )}

                <br>

                Time:
                ${escapeHTML(
                    schoolData.admission.testTime
                )}

             </div>`;

    }else{

        schedule.innerHTML = "";

    }

}


/* =====================================================
   ADMISSION FORM
===================================================== */

async function submitAdmission(event){

    event.preventDefault();

    if(!schoolData.admission.allowed){

        getEl("admissionMessageOutput").innerHTML =
            `<span style="color:#b00020">
                Admissions are currently closed.
             </span>`;

        return;

    }


    const name =
        getEl("admissionName").value.trim();

    const parent =
        getEl("admissionParent").value.trim();

    const phone =
        getEl("admissionPhone").value.trim();

    const studentClass =
        getEl("admissionClass").value.trim();

    const studentPhotoFile =
        getEl("admissionStudentPhoto").files[0];

    const formBPhotoFile =
        getEl("FormBPhoto").files[0];


    if(
        !studentPhotoFile ||
        !formBPhotoFile
    ){

        alert(
            "Please select both the student photo and form B photo."
        );

        return;

    }


    try{

        /*
        SAVE PHOTOS IN INDEXEDDB.
        They are NOT placed in localStorage.
        */

        const studentPhotoId =
            await savePhoto(
                studentPhotoFile
            );

        const formBPhotoId =
            await savePhoto(
                formBPhotoFile
            );


        const admission = {

            id:id(),

            type:"admission",

            name:name,

            parent:parent,

            phone:phone,

            studentClass:studentClass,

            studentPhotoId:
                studentPhotoId,

            formBPhotoId:
                formBPhotoId,

            date:
                new Date().toISOString(),

            read:false

        };


        schoolData.inbox.push(
            admission
        );

        saveData();


        getEl("admissionMessageOutput").innerHTML =
            `<div class="success-box">
                ✅ Admission application sent successfully.
                The school will review your application.
             </div>`;


        getEl("admissionForm").reset();

        renderAdmissionStatus();

    }catch(error){

        console.error(error);

        alert(
            "Could not save the admission photos. Please try again."
        );

    }

}


/* =====================================================
   CONTACT
===================================================== */

function submitContact(event){

    event.preventDefault();

    const name =
        getEl("contactName").value.trim();

    const email =
        getEl("contactEmail").value.trim();

    const message =
        getEl("contactMessage").value.trim();


    schoolData.inbox.push({

        id:id(),

        type:"contact",

        name:name,

        email:email,

        message:message,

        date:new Date().toISOString(),

        read:false

    });


    saveData();

    getEl("contactMessageOutput").innerHTML =
        `<div class="success-box">
            ✅ Message sent successfully.
         </div>`;

    getEl("contactForm").reset();

}


/* =====================================================
   RESULT SEARCH
===================================================== */

function searchResult(event){

    event.preventDefault();

    const grade =
        getEl("resultGrade").value;

    const roll =
        getEl("resultRoll").value.trim()
            .toLowerCase();


    const result =
        schoolData.results.find(item =>

            item.grade === grade &&
            String(item.roll).toLowerCase() === roll

        );


    const output =
        getEl("resultOutput");


    if(!result){

        output.innerHTML =
            `<div class="error-box">
                ❌ Your result was not found.
             </div>`;

        return;

    }


    let total = 0;
    let obtained = 0;


    const rows =
        result.subjects.map(subject=>{

            const marks =
                Number(subject.marks) || 0;

            const max =
                Number(subject.total) || 0;

            obtained += marks;
            total += max;

            return `

                <tr>

                    <td>
                        ${escapeHTML(subject.name)}
                    </td>

                    <td>
                        ${marks}
                    </td>

                    <td>
                        ${max}
                    </td>

                </tr>

            `;

        }).join("");


    const percentage =
        total
        ?
        ((obtained / total) * 100).toFixed(2)
        :
        "0";


    output.innerHTML = `

        <div class="result-item">

            <h3>
                ${escapeHTML(result.name)}
            </h3>

            <p>
                <strong>Roll:</strong>
                ${escapeHTML(result.roll)}
            </p>

            <p>
                <strong>Class:</strong>
                ${escapeHTML(result.grade)}
            </p>

            <table class="result-table">

                <thead>

                    <tr>
                        <th>Subject</th>
                        <th>Obtained</th>
                        <th>Total</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

            <h3>
                Total:
                ${obtained} / ${total}
            </h3>

            <h3>
                Percentage:
                ${percentage}%
            </h3>

        </div>

    `;

}


/* =====================================================
   STUDENT LOGIN
===================================================== */

let currentStudentId = null;


function studentLogin(event){

    event.preventDefault();

    const username =
        getEl("studentUsername")
            .value.trim();

    const password =
        getEl("studentPassword")
            .value;


    const student =
        schoolData.students.find(item =>

            item.username === username &&
            item.password === password

        );


    const message =
        getEl("studentLoginMessage");


    if(!student){

        message.innerHTML =
            `<div class="error-box">
                ❌ Invalid username or password.
             </div>`;

        return;

    }


    if(student.status === "suspended"){

        message.innerHTML =
            `<div class="error-box">
                ⚠️ Your account is suspended.
             </div>`;

        return;

    }


    if(student.status === "banned"){

        message.innerHTML =
            `<div class="error-box">
                ❌ Your account is banned.
             </div>`;

        return;

    }


    currentStudentId =
        student.id;


    getEl("studentDashboard")
        .classList.remove("hidden");


    getEl("studentWelcome")
        .textContent =
            student.name;


    message.innerHTML =
        `<div class="success-box">
            Login successful.
         </div>`;


    renderStudentTests();

    renderStudentResults();

}


/* =====================================================
   STUDENT LOGOUT
===================================================== */

function studentLogout(){

    currentStudentId = null;

    getEl("studentDashboard")
        .classList.add("hidden");

    getEl("studentLoginForm")
        .reset();

    getEl("studentLoginMessage")
        .innerHTML = "";

}


/* =====================================================
   STUDENT TESTS
===================================================== */

let activeTestTimer = null;


function renderStudentTests(){

    const container =
        getEl("studentTestsOutput");

    const student =
        schoolData.students.find(
            s => s.id === currentStudentId
        );


    if(!student){

        container.innerHTML =
            `<div class="empty-message">
                Please login.
             </div>`;

        return;

    }


    const tests =
        schoolData.tests.filter(
            test =>
                test.grade === student.grade
        );


    if(!tests.length){

        container.innerHTML =
            `<div class="empty-message">
                No tests available for your class.
             </div>`;

        return;

    }


    container.innerHTML = "";


    tests.forEach(test=>{

        const alreadySubmitted =
            schoolData.submissions.some(
                submission =>
                    submission.testId === test.id &&
                    submission.studentId === student.id
            );


        const div =
            document.createElement("div");

        div.className =
            "item-card";


        div.innerHTML = `

            <h3>
                ${escapeHTML(test.title)}
            </h3>

            <p>
                <strong>Subject:</strong>
                ${escapeHTML(test.subject)}
            </p>

            <p>
                <strong>Time:</strong>
                ${test.duration} minutes
            </p>

            <p>
                ${escapeHTML(test.instructions || "")}
            </p>

            ${
                alreadySubmitted

                ?

                `<div class="success-box">
                    ✅ You have already submitted this test.
                 </div>`

                :

                `<button
                    class="main-button"
                    type="button"
                    onclick="startStudentTest('${test.id}')"
                >
                    Start Test
                 </button>`
            }

        `;


        container.appendChild(div);

    });

}


/* =====================================================
   START STUDENT TEST
===================================================== */

function startStudentTest(testId){

    const test =
        schoolData.tests.find(
            item => item.id === testId
        );


    const student =
        schoolData.students.find(
            item => item.id === currentStudentId
        );


    if(!test || !student){
        return;
    }


    const container =
        getEl("studentTestsOutput");


    let html = `

        <div class="card">

            <h2>
                ${escapeHTML(test.title)}
            </h2>

            <p>
                ${escapeHTML(test.instructions || "")}
            </p>

            <div
                id="studentTimer"
                class="timer-box"
            >
                ${test.duration}:00
            </div>

            <form id="activeStudentTestForm">

    `;


    test.questions.forEach((question,index)=>{

        html += `

            <div class="student-question">

                <h3>
                    ${index + 1}.
                    ${escapeHTML(question.text)}
                </h3>

                ${question.options.map(
                    (option,optIndex)=>`

                        <label>

                            <input
                                type="radio"
                                name="question_${index}"
                                value="${optIndex}"
                            >

                            ${escapeHTML(option)}

                        </label>

                    `
                ).join("")}

            </div>

        `;

    });


    html += `

            <button
                id="submitStudentTestButton"
                class="main-button"
                type="submit"
            >
                Submit Test
            </button>

            </form>

        </div>

    `;


    container.innerHTML =
        html;


    const form =
        getEl("activeStudentTestForm");


    form.addEventListener(
        "submit",
        function(event){

            event.preventDefault();

            submitStudentTest(
                test,
                false
            );

        }
    );


    startTimer(
        test.duration * 60,
        test
    );

}


/* =====================================================
   TIMER
===================================================== */

function startTimer(seconds,test){

    if(activeTestTimer){

        clearInterval(
            activeTestTimer
        );

    }


    let remaining =
        seconds;


    const timer =
        getEl("studentTimer");


    function updateTimer(){

        const minutes =
            Math.floor(
                remaining / 60
            );

        const secs =
            remaining % 60;


        timer.textContent =
            String(minutes).padStart(2,"0")
            + ":"
            +
            String(secs).padStart(2,"0");


        if(remaining <= 60){

            timer.classList.add(
                "timer-expired"
            );

        }


        if(remaining <= 0){

            clearInterval(
                activeTestTimer
            );

            timer.textContent =
                "TIME FINISHED";


            submitStudentTest(
                test,
                true
            );

            return;

        }


        remaining--;

    }


    updateTimer();


    activeTestTimer =
        setInterval(
            updateTimer,
            1000
        );

}


/* =====================================================
   SUBMIT TEST
===================================================== */

function submitStudentTest(
    test,
    automatic
){

    if(activeTestTimer){

        clearInterval(
            activeTestTimer
        );

        activeTestTimer = null;

    }


    const form =
        getEl("activeStudentTestForm");


    if(!form){
        return;
    }


    const student =
        schoolData.students.find(
            item =>
                item.id === currentStudentId
        );


    if(!student){
        return;
    }


    const answers = [];

    let autoMarks = 0;


    test.questions.forEach(
        (question,index)=>{

            const selected =
                form.querySelector(
                    `input[name="question_${index}"]:checked`
                );


            const answer =
                selected
                ?
                Number(selected.value)
                :
                null;


            answers.push(answer);


            if(
                answer !== null &&
                answer === Number(question.correct)
            ){

                autoMarks +=
                    Number(question.marks) || 1;

            }

        }
    );


    schoolData.submissions.push({

        id:id(),

        testId:test.id,

        studentId:student.id,

        studentName:student.name,

        studentRoll:student.roll,

        grade:student.grade,

        answers:answers,

        automaticMarks:autoMarks,

        marks:autoMarks,

        submittedAt:
            new Date().toISOString(),

        automatic:automatic,

        teacherMarksEdited:false

    });


    saveData();


    getEl("studentTestsOutput").innerHTML = `

        <div class="success-box">

            ${
                automatic
                ?
                "⏰ Time finished. Your test was automatically submitted."
                :
                "✅ Your test was submitted successfully."
            }

        </div>

    `;


    renderStudentResults();

    renderTestMarkSheets();

}


/* =====================================================
   STUDENT TEST RESULTS
===================================================== */

function renderStudentResults(){

    const container =
        getEl("studentTestResults");


    if(!currentStudentId){

        container.innerHTML =
            `<div class="empty-message">
                Login to see your results.
             </div>`;

        return;

    }


    const submissions =
        schoolData.submissions.filter(
            item =>
                item.studentId ===
                currentStudentId
        );


    if(!submissions.length){

        container.innerHTML =
            `<div class="empty-message">
                No test results yet.
             </div>`;

        return;

    }


    container.innerHTML =
        submissions.map(submission=>{

            const test =
                schoolData.tests.find(
                    t =>
                        t.id === submission.testId
                );


            return `

                <div class="result-item">

                    <h3>
                        ${escapeHTML(
                            test
                            ?
                            test.title
                            :
                            "Test"
                        )}
                    </h3>

                    <p>
                        Marks:
                        <strong>
                            ${submission.marks}
                        </strong>
                    </p>

                    <p>
                        Submitted:
                        ${formatDate(
                            submission.submittedAt
                        )}
                    </p>

                </div>

            `;

        }).join("");

}


/* =====================================================
   STAFF LOGIN
===================================================== */

let staffLoggedIn = false;


function staffLogin(event){

    event.preventDefault();

    const username =
        getEl("staffUsername")
            .value.trim();

    const password =
        getEl("staffPassword")
            .value;


    if(
        username ===
            schoolData.accounts.staff.username
        &&
        password ===
            schoolData.accounts.staff.password
    ){

        staffLoggedIn = true;

        getEl("staffLoginPanel")
            .classList.add("hidden");

        getEl("staffDashboard")
            .classList.remove("hidden");

        getEl("staffLoginMessage")
            .innerHTML = "";

        renderStaff();

    }else{

        getEl("staffLoginMessage").innerHTML =
            `<div class="error-box">
                ❌ Invalid staff username or password.
             </div>`;

    }

}


/* =====================================================
   STAFF LOGOUT
===================================================== */

function staffLogout(){

    staffLoggedIn = false;

    getEl("staffDashboard")
        .classList.add("hidden");

    getEl("staffLoginPanel")
        .classList.remove("hidden");

    getEl("staffLoginForm")
        .reset();

}


/* =====================================================
   CREATE STUDENT
===================================================== */

function createOrUpdateStudent(){

    const name =
        getEl("studentName").value.trim();

    const roll =
        getEl("studentRoll").value.trim();

    const grade =
        getEl("studentGrade").value;

    const username =
        getEl("studentUsernameCreate")
            .value.trim();

    const password =
        getEl("studentPasswordCreate")
            .value;

    const editingId =
        getEl("editingStudentId").value;


    if(
        !name ||
        !roll ||
        !grade ||
        !username ||
        !password
    ){

        alert(
            "Please fill all student account fields."
        );

        return;

    }


    /*
    Prevent duplicate username.
    */

    const duplicate =
        schoolData.students.find(
            student =>
                student.username === username &&
                student.id !== editingId
        );


    if(duplicate){

        alert(
            "This username already exists."
        );

        return;

    }


    if(editingId){

        const student =
            schoolData.students.find(
                s =>
                    s.id === editingId
            );


        if(student){

            student.name = name;
            student.roll = roll;
            student.grade = grade;
            student.username = username;
            student.password = password;

        }


        alert(
            "Student account updated successfully."
        );


    }else{

        schoolData.students.push({

            id:id(),

            name:name,

            roll:roll,

            grade:grade,

            username:username,

            password:password,

            status:"active",

            createdAt:
                new Date().toISOString()

        });


        alert(
            "Student account created successfully."
        );

    }


    saveData();

    clearStudentForm();

    renderStaffStudents();

}


/* =====================================================
   EDIT STUDENT
===================================================== */

function editStudent(studentId){

    const student =
        schoolData.students.find(
            s => s.id === studentId
        );


    if(!student){
        return;
    }


    getEl("studentName").value =
        student.name;

    getEl("studentRoll").value =
        student.roll;

    getEl("studentGrade").value =
        student.grade;

    getEl("studentUsernameCreate").value =
        student.username;

    getEl("studentPasswordCreate").value =
        student.password;

    getEl("editingStudentId").value =
        student.id;


    getEl("createStudentButton")
        .textContent =
            "Update Student";


    getEl("cancelStudentEditButton")
        .classList.remove(
            "hidden"
        );


    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

}


/* =====================================================
   CLEAR STUDENT FORM
===================================================== */

function clearStudentForm(){

    getEl("studentName").value = "";
    getEl("studentRoll").value = "";
    getEl("studentGrade").value = "";
    getEl("studentUsernameCreate").value = "";
    getEl("studentPasswordCreate").value = "";
    getEl("editingStudentId").value = "";

    getEl("createStudentButton")
        .textContent =
            "Create Student";


    getEl("cancelStudentEditButton")
        .classList.add(
            "hidden"
        );

}


/* =====================================================
   DELETE STUDENT
===================================================== */

function deleteStudent(studentId){

    const student =
        schoolData.students.find(
            s => s.id === studentId
        );


    if(!student){
        return;
    }


    const confirmed =
        confirm(
            `Delete student account "${student.name}"?`
        );


    if(!confirmed){
        return;
    }


    /*
    Remove account.
    */

    schoolData.students =
        schoolData.students.filter(
            s => s.id !== studentId
        );


    /*
    Remove this student's submissions.
    */

    schoolData.submissions =
        schoolData.submissions.filter(
            s => s.studentId !== studentId
        );


    saveData();


    if(
        currentStudentId === studentId
    ){

        studentLogout();

    }


    renderStaffStudents();

    renderTestMarkSheets();

    alert(
        "Student account deleted."
    );

}


/* =====================================================
   SUSPEND / ACTIVATE / BAN
===================================================== */

function changeStudentStatus(
    studentId,
    status
){

    const student =
        schoolData.students.find(
            s => s.id === studentId
        );


    if(!student){
        return;
    }


    student.status =
        status;


    saveData();

    renderStaffStudents();

}


/* =====================================================
   STAFF STUDENT LIST
===================================================== */

function renderStaffStudents(){

    const container =
        getEl("staffStudentsList");


    if(!schoolData.students.length){

        container.innerHTML =
            `<div class="empty-message">
                No student accounts created.
             </div>`;

        return;

    }


    container.innerHTML =
        schoolData.students.map(
            student=>`

            <div class="student-item">

                <h3>
                    ${escapeHTML(student.name)}
                </h3>

                <p>
                    <strong>Roll:</strong>
                    ${escapeHTML(student.roll)}
                </p>

                <p>
                    <strong>Class:</strong>
                    ${escapeHTML(student.grade)}
                </p>

                <p>
                    <strong>Username:</strong>
                    ${escapeHTML(student.username)}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(
                        student.status || "active"
                    )}
                </p>

                <button
                    class="edit-button"
                    onclick="editStudent('${student.id}')"
                >
                    ✏️ Edit
                </button>

                <button
                    class="danger-button"
                    onclick="deleteStudent('${student.id}')"
                >
                    🗑️ Delete
                </button>

                ${
                    student.status !== "active"
                    ?
                    `<button
                        class="success-button"
                        onclick="changeStudentStatus('${student.id}','active')"
                    >
                        Activate
                     </button>`
                    :
                    `<button
                        class="secondary-button"
                        onclick="changeStudentStatus('${student.id}','suspended')"
                    >
                        Suspend
                     </button>`
                }

            </div>

        `
        ).join("");

}


/* =====================================================
   SUBJECT INPUTS
===================================================== */

let subjectCount = 0;


function addSubjectInput(
    subjectName="",
    marks="",
    total="100"
){

    subjectCount++;

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "item-card";


    wrapper.dataset.subject =
        "true";


    wrapper.innerHTML = `

        <input
            class="subject-name"
            placeholder="Subject Name"
            value="${escapeHTML(subjectName)}"
        >

        <input
            class="subject-marks"
            type="number"
            placeholder="Obtained Marks"
            value="${escapeHTML(marks)}"
        >

        <input
            class="subject-total"
            type="number"
            placeholder="Total Marks"
            value="${escapeHTML(total)}"
        >

        <button
            type="button"
            class="danger-button remove-subject-button"
        >
            Remove Subject
        </button>

    `;


    wrapper
        .querySelector(
            ".remove-subject-button"
        )
        .addEventListener(
            "click",
            ()=>{
                wrapper.remove();
            }
        );


    getEl("subjectInputs")
        .appendChild(wrapper);

}


/* =====================================================
   SAVE RESULT
===================================================== */

function saveResult(){

    const name =
        getEl("resultStudentName")
            .value.trim();

    const roll =
        getEl("resultStudentRoll")
            .value.trim();

    const grade =
        getEl("resultStudentGrade")
            .value;


    if(!name || !roll || !grade){

        alert(
            "Enter student name, roll number and class."
        );

        return;

    }


    const subjects = [];


    getEl("subjectInputs")
        .querySelectorAll(
            '[data-subject="true"]'
        )
        .forEach(wrapper=>{

            const subject =
                wrapper
                    .querySelector(
                        ".subject-name"
                    )
                    .value.trim();

            const marks =
                wrapper
                    .querySelector(
                        ".subject-marks"
                    )
                    .value;

            const total =
                wrapper
                    .querySelector(
                        ".subject-total"
                    )
                    .value;


            if(subject){

                subjects.push({

                    name:subject,

                    marks:Number(marks) || 0,

                    total:Number(total) || 0

                });

            }

        });


    if(!subjects.length){

        alert(
            "Add at least one subject."
        );

        return;

    }


    const existing =
        schoolData.results.find(
            result =>
                String(result.roll).toLowerCase()
                ===
                String(roll).toLowerCase()
                &&
                result.grade === grade
        );


    if(existing){

        existing.name =
            name;

        existing.subjects =
            subjects;

        existing.updatedAt =
            new Date().toISOString();

    }else{

        schoolData.results.push({

            id:id(),

            name:name,

            roll:roll,

            grade:grade,

            subjects:subjects,

            createdAt:
                new Date().toISOString()

        });

    }


    saveData();

    alert(
        "Result saved successfully."
    );


    getEl("resultStudentName").value = "";
    getEl("resultStudentRoll").value = "";
    getEl("resultStudentGrade").value = "";
    getEl("subjectInputs").innerHTML = "";

    renderStaffResults();

}


/* =====================================================
   STAFF RESULTS
===================================================== */

function renderStaffResults(){

    const container =
        getEl("staffResultsList");


    if(!schoolData.results.length){

        container.innerHTML =
            `<div class="empty-message">
                No results saved.
             </div>`;

        return;

    }


    container.innerHTML =
        schoolData.results
            .map(result=>`

                <div class="result-item">

                    <h3>
                        ${escapeHTML(result.name)}
                    </h3>

                    <p>
                        Roll:
                        ${escapeHTML(result.roll)}
                    </p>

                    <p>
                        Class:
                        ${escapeHTML(result.grade)}
                    </p>

                    <button
                        class="edit-button"
                        onclick="editResult('${result.id}')"
                    >
                        ✏️ Edit
                    </button>

                    <button
                        class="danger-button"
                        onclick="deleteResult('${result.id}')"
                    >
                        🗑️ Delete
                    </button>

                </div>

            `)
            .join("");

}


/* =====================================================
   EDIT RESULT
===================================================== */

function editResult(resultId){

    const result =
        schoolData.results.find(
            r => r.id === resultId
        );


    if(!result){
        return;
    }


    getEl("resultStudentName").value =
        result.name;

    getEl("resultStudentRoll").value =
        result.roll;

    getEl("resultStudentGrade").value =
        result.grade;


    getEl("subjectInputs").innerHTML = "";


    result.subjects.forEach(
        subject =>
            addSubjectInput(
                subject.name,
                subject.marks,
                subject.total
            )
    );

}


/* =====================================================
   DELETE RESULT
===================================================== */

function deleteResult(resultId){

    if(!confirm("Delete this result?")){
        return;
    }


    schoolData.results =
        schoolData.results.filter(
            r => r.id !== resultId
        );


    saveData();

    renderStaffResults();

}


/* =====================================================
   TEST QUESTIONS
===================================================== */

let questionNumber = 0;


function addQuestion(){

    questionNumber++;


    const wrapper =
        document.createElement("div");

    wrapper.className =
        "test-question";


    wrapper.dataset.question =
        "true";


    wrapper.innerHTML = `

        <h4>
            Question ${questionNumber}
        </h4>

        <textarea
            class="question-text"
            placeholder="Question"
        ></textarea>

        <input
            class="question-option"
            placeholder="Option A"
        >

        <input
            class="question-option"
            placeholder="Option B"
        >

        <input
            class="question-option"
            placeholder="Option C"
        >

        <input
            class="question-option"
            placeholder="Option D"
        >

        <label>
            Correct Option
        </label>

        <select class="question-correct">

            <option value="0">Option A</option>
            <option value="1">Option B</option>
            <option value="2">Option C</option>
            <option value="3">Option D</option>

        </select>

        <input
            class="question-marks"
            type="number"
            min="1"
            value="1"
            placeholder="Marks"
        >

        <button
            type="button"
            class="danger-button remove-question"
        >
            Remove Question
        </button>

    `;


    wrapper
        .querySelector(
            ".remove-question"
        )
        .addEventListener(
            "click",
            ()=>{
                wrapper.remove();
            }
        );


    getEl("testQuestions")
        .appendChild(wrapper);

}


/* =====================================================
   SAVE TEST
===================================================== */

function saveTest(){

    const grade =
        getEl("testClass").value;

    const title =
        getEl("testTitle")
            .value.trim();

    const subject =
        getEl("testSubject")
            .value.trim();

    const duration =
        Number(
            getEl("testDuration").value
        );

    const instructions =
        getEl("testInstructions")
            .value.trim();


    if(
        !grade ||
        !title ||
        !subject ||
        !duration
    ){

        alert(
            "Fill in class, title, subject and duration."
        );

        return;

    }


    const questions = [];


    getEl("testQuestions")
        .querySelectorAll(
            '[data-question="true"]'
        )
        .forEach(wrapper=>{

            const text =
                wrapper
                    .querySelector(
                        ".question-text"
                    )
                    .value.trim();

            const options =
                Array.from(
                    wrapper.querySelectorAll(
                        ".question-option"
                    )
                )
                .map(
                    input =>
                        input.value.trim()
                );


            const correct =
                Number(
                    wrapper
                        .querySelector(
                            ".question-correct"
                        )
                        .value
                );


            const marks =
                Number(
                    wrapper
                        .querySelector(
                            ".question-marks"
                        )
                        .value
                ) || 1;


            if(text){

                questions.push({

                    text:text,

                    options:options,

                    correct:correct,

                    marks:marks

                });

            }

        });


    if(!questions.length){

        alert(
            "Add at least one question."
        );

        return;

    }


    schoolData.tests.push({

        id:id(),

        grade:grade,

        title:title,

        subject:subject,

        duration:duration,

        instructions:instructions,

        questions:questions,

        createdAt:
            new Date().toISOString()

    });


    saveData();


    alert(
        "Test created successfully."
    );


    clearTestForm();

    renderStaffTests();

}


/* =====================================================
   CLEAR TEST FORM
===================================================== */

function clearTestForm(){

    getEl("testClass").value = "";

    getEl("testTitle").value = "";

    getEl("testSubject").value = "";

    getEl("testDuration").value = "30";

    getEl("testInstructions").value = "";

    getEl("testQuestions").innerHTML = "";

    questionNumber = 0;

}


/* =====================================================
   STAFF TEST LIST
===================================================== */

function renderStaffTests(){

    const container =
        getEl("staffTestsList");


    if(!schoolData.tests.length){

        container.innerHTML =
            `<div class="empty-message">
                No tests created.
             </div>`;

        return;

    }


    container.innerHTML =
        schoolData.tests.map(test=>`

            <div class="item-card">

                <h3>
                    ${escapeHTML(test.title)}
                </h3>

                <p>
                    Class:
                    ${escapeHTML(test.grade)}
                </p>

                <p>
                    Subject:
                    ${escapeHTML(test.subject)}
                </p>

                <p>
                    Time:
                    ${test.duration} minutes
                </p>

                <p>
                    Questions:
                    ${test.questions.length}
                </p>

                <button
                    class="danger-button"
                    onclick="deleteTest('${test.id}')"
                >
                    🗑️ Delete Test
                </button>

            </div>

        `).join("");

}


/* =====================================================
   DELETE TEST
===================================================== */

function deleteTest(testId){

    if(!confirm("Delete this test?")){
        return;
    }


    schoolData.tests =
        schoolData.tests.filter(
            test =>
                test.id !== testId
        );


    schoolData.submissions =
        schoolData.submissions.filter(
            submission =>
                submission.testId !== testId
        );


    saveData();

    renderStaffTests();

    renderTestMarkSheets();

}


/* =====================================================
   TEST MARK SHEETS
===================================================== */

function renderTestMarkSheets(){

    const container =
        getEl("testMarkSheets");


    if(!schoolData.submissions.length){

        container.innerHTML =
            `<div class="empty-message">
                No student test submissions.
             </div>`;

        return;

    }


    container.innerHTML =
        schoolData.submissions
            .map(submission=>{

                const test =
                    schoolData.tests.find(
                        t =>
                            t.id === submission.testId
                    );


                return `

                    <div class="test-submission">

                        <h3>
                            ${escapeHTML(
                                submission.studentName
                            )}
                        </h3>

                        <p>
                            Roll:
                            ${escapeHTML(
                                submission.studentRoll
                            )}
                        </p>

                        <p>
                            Class:
                            ${escapeHTML(
                                submission.grade
                            )}
                        </p>

                        <p>
                            Test:
                            ${escapeHTML(
                                test
                                ?
                                test.title
                                :
                                "Deleted Test"
                            )}
                        </p>

                        <p>
                            Submitted:
                            ${formatDate(
                                submission.submittedAt
                            )}
                        </p>

                        <label>
                            Marks
                        </label>

                        <input
                            id="marks_${submission.id}"
                            type="number"
                            min="0"
                            value="${submission.marks}"
                        >

                        <button
                            class="main-button"
                            onclick="saveSubmissionMarks('${submission.id}')"
                        >
                            Save Marks
                        </button>

                    </div>

                `;

            })
            .join("");

}


/* =====================================================
   SAVE SUBMISSION MARKS
===================================================== */

function saveSubmissionMarks(
    submissionId
){

    const submission =
        schoolData.submissions.find(
            s =>
                s.id === submissionId
        );


    if(!submission){
        return;
    }


    const input =
        getEl(
            "marks_" +
            submissionId
        );


    const marks =
        Number(input.value);


    if(
        isNaN(marks) ||
        marks < 0
    ){

        alert("Enter valid marks.");

        return;

    }


    submission.marks =
        marks;

    submission.teacherMarksEdited =
        true;


    saveData();

    renderTestMarkSheets();

    renderStudentResults();


    alert(
        "Marks updated successfully."
    );

}


/* =====================================================
   PRINCIPAL LOGIN
===================================================== */

let principalLoggedIn = false;


function principalLogin(event){

    event.preventDefault();


    const username =
        getEl("principalUsername")
            .value.trim();

    const password =
        getEl("principalPassword")
            .value;


    if(
        username ===
            schoolData.accounts.principal.username
        &&
        password ===
            schoolData.accounts.principal.password
    ){

        principalLoggedIn = true;

        getEl("principalLoginPanel")
            .classList.add("hidden");

        getEl("principalDashboard")
            .classList.remove("hidden");

        getEl("principalLoginMessage")
            .innerHTML = "";


        loadPrincipalFields();

        renderPrincipal();

    }else{

        getEl("principalLoginMessage").innerHTML =
            `<div class="error-box">
                ❌ Invalid principal username or password.
             </div>`;

    }

}


/* =====================================================
   PRINCIPAL LOGOUT
===================================================== */

function principalLogout(){

    principalLoggedIn = false;

    getEl("principalDashboard")
        .classList.add("hidden");

    getEl("principalLoginPanel")
        .classList.remove("hidden");

    getEl("principalLoginForm")
        .reset();

}


/* =====================================================
   LOAD PRINCIPAL FIELDS
===================================================== */

function loadPrincipalFields(){

    getEl("principalAbout").value =
        schoolData.about;


    getEl("admissionTestDate").value =
        schoolData.admission.testDate || "";


    getEl("admissionTestTime").value =
        schoolData.admission.testTime || "";

}


/* =====================================================
   SAVE ABOUT
===================================================== */

function saveAbout(){

    schoolData.about =
        getEl("principalAbout")
            .value.trim();


    saveData();

    renderHome();

    alert(
        "About information saved."
    );

}


/* =====================================================
   ADD RESOURCE
===================================================== */

function addResource(){

    const title =
        getEl("resourceTitle")
            .value.trim();

    const content =
        getEl("resourceContent")
            .value.trim();


    if(!title || !content){

        alert(
            "Enter resource title and content."
        );

        return;

    }


    schoolData.resources.push({

        id:id(),

        title:title,

        content:content,

        createdAt:
            new Date().toISOString()

    });


    saveData();


    getEl("resourceTitle").value = "";

    getEl("resourceContent").value = "";


    renderPrincipalResources();

    renderResources();


    alert(
        "Resource added."
    );

}


/* =====================================================
   PRINCIPAL RESOURCE LIST
===================================================== */

function renderPrincipalResources(){

    const container =
        getEl("principalResourcesList");


    container.innerHTML =
        schoolData.resources.map(resource=>`

            <div class="item-card">

                <h3>
                    ${escapeHTML(resource.title)}
                </h3>

                <p>
                    ${escapeHTML(resource.content)}
                </p>

                <button
                    class="danger-button"
                    onclick="deleteResource('${resource.id}')"
                >
                    Delete
                </button>

            </div>

        `).join("");

}


/* =====================================================
   DELETE RESOURCE
===================================================== */

function deleteResource(resourceId){

    if(!confirm("Delete this resource?")){
        return;
    }


    schoolData.resources =
        schoolData.resources.filter(
            r =>
                r.id !== resourceId
        );


    saveData();

    renderPrincipalResources();

    renderResources();

}


/* =====================================================
   ADD HOME PHOTO
===================================================== */

async function addHomePhoto(){

    const file =
        getEl("homePhoto").files[0];


    if(!file){

        alert(
            "Please select a photo."
        );

        return;

    }


    try{

        const photoId =
            await savePhoto(file);


        schoolData.homePhotos.push({

            id:id(),

            photoId:photoId,

            createdAt:
                new Date().toISOString()

        });


        saveData();


        getEl("homePhoto").value = "";


        renderPrincipalHomePhotos();

        renderHome();


    }catch(error){

        console.error(error);

        alert(
            "Could not save photo."
        );

    }

}


/* =====================================================
   PRINCIPAL HOME PHOTOS
===================================================== */

async function renderPrincipalHomePhotos(){

    const container =
        getEl("principalHomePhotos");

    container.innerHTML = "";


    for(const photo of schoolData.homePhotos){

        const url =
            await photoURL(
                photo.photoId
            );


        if(!url){
            continue;
        }


        container.innerHTML += `

            <div class="photo-card">

                <img
                    src="${url}"
                    alt="School Photo"
                >

                <div class="photo-card-content">

                    <button
                        class="danger-button"
                        onclick="deleteHomePhoto('${photo.id}')"
                    >
                        🗑️ Delete
                    </button>

                </div>

            </div>

        `;

    }

}


/* =====================================================
   DELETE HOME PHOTO
===================================================== */

async function deleteHomePhoto(
    recordId
){

    const photo =
        schoolData.homePhotos.find(
            p =>
                p.id === recordId
        );


    if(!photo){
        return;
    }


    if(!confirm("Delete this photo?")){
        return;
    }


    await deletePhoto(
        photo.photoId
    );


    schoolData.homePhotos =
        schoolData.homePhotos.filter(
            p =>
                p.id !== recordId
        );


    saveData();

    renderPrincipalHomePhotos();

    renderHome();

}


/* =====================================================
   SAVE CLASS
===================================================== */

function saveClass(){

    const grade =
        getEl("principalGrade").value;

    const teacher =
        getEl("principalTeacher")
            .value.trim();

    const subjects =
        getEl("principalSubjects")
            .value.trim();


    if(!grade){

        alert(
            "Select a grade."
        );

        return;

    }


    schoolData.classes[grade] = {

        teacher:teacher,

        subjects:subjects

    };


    saveData();

    renderClasses();


    alert(
        "Class information saved."
    );

}


/* =====================================================
   ADD TEACHER
===================================================== */

async function addTeacher(){

    const name =
        getEl("teacherName")
            .value.trim();

    const subject =
        getEl("teacherSubject")
            .value.trim();

    const description =
        getEl("teacherDescription")
            .value.trim();

    const file =
        getEl("teacherPhoto").files[0];


    if(!name || !subject){

        alert(
            "Enter teacher name and subject."
        );

        return;

    }


    let photoId = null;


    try{

        if(file){

            photoId =
                await savePhoto(file);

        }


        schoolData.teachers.push({

            id:id(),

            name:name,

            subject:subject,

            description:description,

            photoId:photoId

        });


        saveData();


        getEl("teacherName").value = "";

        getEl("teacherSubject").value = "";

        getEl("teacherDescription").value = "";

        getEl("teacherPhoto").value = "";


        renderPrincipalTeachers();

        renderTeachers();


        alert(
            "Teacher added."
        );

    }catch(error){

        console.error(error);

        alert(
            "Could not save teacher."
        );

    }

}


/* =====================================================
   PRINCIPAL TEACHERS
===================================================== */

async function renderPrincipalTeachers(){

    const container =
        getEl("principalTeachersList");

    container.innerHTML = "";


    for(const teacher of schoolData.teachers){

        const url =
            await photoURL(
                teacher.photoId
            );


        container.innerHTML += `

            <div class="item-card">

                ${
                    url
                    ?
                    `<img
                        class="account-photo"
                        src="${url}"
                    >`
                    :
                    ""
                }

                <h3>
                    ${escapeHTML(teacher.name)}
                </h3>

                <p>
                    ${escapeHTML(teacher.subject)}
                </p>

                <button
                    class="danger-button"
                    onclick="deleteTeacher('${teacher.id}')"
                >
                    🗑️ Delete Teacher
                </button>

            </div>

        `;

    }

}


/* =====================================================
   DELETE TEACHER
===================================================== */

async function deleteTeacher(
    teacherId
){

    const teacher =
        schoolData.teachers.find(
            t =>
                t.id === teacherId
        );


    if(!teacher){
        return;
    }


    if(!confirm("Delete this teacher?")){
        return;
    }


    if(teacher.photoId){

        await deletePhoto(
            teacher.photoId
        );

    }


    schoolData.teachers =
        schoolData.teachers.filter(
            t =>
                t.id !== teacherId
        );


    saveData();

    renderPrincipalTeachers();

    renderTeachers();

}


/* =====================================================
   PUBLISH ANNOUNCEMENT
===================================================== */

function publishAnnouncement(){

    const title =
        getEl("announcementTitle")
            .value.trim();

    const body =
        getEl("announcementBody")
            .value.trim();


    if(!title || !body){

        alert(
            "Enter announcement title and text."
        );

        return;

    }


    schoolData.announcements.push({

        id:id(),

        title:title,

        body:body,

        date:
            new Date().toISOString()

    });


    saveData();


    getEl("announcementTitle").value = "";

    getEl("announcementBody").value = "";


    renderHome();


    alert(
        "Announcement published."
    );

}


/* =====================================================
   ADMISSION CONTROL
===================================================== */

function openAdmission(){

    schoolData.admission.allowed =
        true;

    saveData();

    renderAdmissionStatus();

    renderPrincipalAdmission();

}


function closeAdmission(){

    schoolData.admission.allowed =
        false;

    saveData();

    renderAdmissionStatus();

    renderPrincipalAdmission();

}


function saveAdmissionSchedule(){

    schoolData.admission.testDate =
        getEl("admissionTestDate")
            .value;

    schoolData.admission.testTime =
        getEl("admissionTestTime")
            .value;


    saveData();

    renderAdmissionStatus();

    renderPrincipalAdmission();


    alert(
        "Admission test schedule saved."
    );

}


function renderPrincipalAdmission(){

    const container =
        getEl("principalAdmissionStatus");


    container.innerHTML = `

        <div class="status-box ${
            schoolData.admission.allowed
            ?
            "status-active"
            :
            "status-suspended"
        }">

            Admission:
            ${
                schoolData.admission.allowed
                ?
                "OPEN"
                :
                "CLOSED"
            }

            <br>

            Test Date:
            ${
                escapeHTML(
                    schoolData.admission.testDate ||
                    "Not set"
                )
            }

            <br>

            Test Time:
            ${
                escapeHTML(
                    schoolData.admission.testTime ||
                    "Not set"
                )
            }

        </div>

    `;

}


/* =====================================================
   CHANGE PRINCIPAL PASSWORD
===================================================== */

function changePrincipalPassword(){

    const oldPassword =
        getEl("principalOldPassword")
            .value;

    const newPassword =
        getEl("principalNewPassword")
            .value;


    if(
        oldPassword !==
        schoolData.accounts.principal.password
    ){

        alert(
            "Old principal password is incorrect."
        );

        return;

    }


    if(newPassword.length < 4){

        alert(
            "New password must contain at least 4 characters."
        );

        return;

    }


    schoolData.accounts.principal.password =
        newPassword;


    saveData();


    getEl("principalOldPassword").value = "";

    getEl("principalNewPassword").value = "";


    alert(
        "Principal password changed."
    );

}


/* =====================================================
   CHANGE STAFF PASSWORD
===================================================== */

function changeStaffPassword(){

    const oldPassword =
        getEl("principalStaffOldPassword")
            .value;

    const newPassword =
        getEl("principalStaffNewPassword")
            .value;


    if(
        oldPassword !==
        schoolData.accounts.staff.password
    ){

        alert(
            "Current staff password is incorrect."
        );

        return;

    }


    if(newPassword.length < 4){

        alert(
            "New password must contain at least 4 characters."
        );

        return;

    }


    schoolData.accounts.staff.password =
        newPassword;


    saveData();


    getEl("principalStaffOldPassword").value = "";

    getEl("principalStaffNewPassword").value = "";


    alert(
        "Staff password changed."
    );

}


/* =====================================================
   PRINCIPAL INBOX
===================================================== */

async function renderPrincipalInbox(){

    const container =
        getEl("principalInbox");


    if(!schoolData.inbox.length){

        container.innerHTML =
            `<div class="empty-message">
                📭 Inbox is empty.
             </div>`;

        return;

    }


    container.innerHTML = "";


    const inbox =
        schoolData.inbox
            .slice()
            .reverse();


    for(const mail of inbox){

        if(mail.type === "admission"){

            const studentURL =
                await photoURL(
                    mail.studentPhotoId
                );


            const formBURL =
                await photoURL(
                    mail.formPhotoId
                );


            container.innerHTML += `

                <div class="item-card">

                    <h3>
                        🎓 Admission Application
                    </h3>

                    <p>
                        <strong>Student:</strong>
                        ${escapeHTML(mail.name)}
                    </p>

                    <p>
                        <strong>Parent:</strong>
                        ${escapeHTML(mail.parent)}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${escapeHTML(mail.phone)}
                    </p>

                    <p>
                        <strong>Class:</strong>
                        ${escapeHTML(mail.studentClass)}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${formatDate(mail.date)}
                    </p>

                    <hr>

                    <h4>
                        📷 Student Photo
                    </h4>

                    ${
                        studentURL
                        ?
                        `<img
                            class="inbox-photo"
                            src="${studentURL}"
                            alt="Student Photo"
                        >`
                        :
                        `<p>
                            Student photo unavailable.
                         </p>`
                    }

                    <h4>
                        📄 Form B
                    </h4>

                    ${
                        formURL
                        ?
                        `<img
                            class="inbox-photo"
                            src="${formURL}"
                            alt="Admission Form"
                        >`
                        :
                        `<p>
                            Form photo unavailable.
                         </p>`
                    }

                    <br>

                    <button
                        class="danger-button"
                        onclick="deleteInboxMail('${mail.id}')"
                    >
                        🗑️ Delete
                    </button>

                </div>

            `;

        }else{

            container.innerHTML += `

                <div class="item-card">

                    <h3>
                        📩 Contact Message
                    </h3>

                    <p>
                        <strong>Name:</strong>
                        ${escapeHTML(mail.name)}
                    </p>

                    <p>
                        <strong>Email:</strong>
                        ${escapeHTML(mail.email)}
                    </p>

                    <p>
                        <strong>Message:</strong>
                        ${escapeHTML(mail.message)}
                    </p>

                    <p>
                        <small>
                            ${formatDate(mail.date)}
                        </small>
                    </p>

                    <button
                        class="danger-button"
                        onclick="deleteInboxMail('${mail.id}')"
                    >
                        🗑️ Delete
                    </button>

                </div>

            `;

        }

    }

}


/* =====================================================
   DELETE ONE INBOX MAIL
===================================================== */

async function deleteInboxMail(
    mailId
){

    const mail =
        schoolData.inbox.find(
            item =>
                item.id === mailId
        );


    if(!mail){
        return;
    }


    if(
        !confirm(
            "Delete this inbox message?"
        )
    ){

        return;

    }


    if(mail.type === "admission"){

        await deletePhoto(
            mail.studentPhotoId
        );

        await deletePhoto(
            mail.formPhotoId
        );

    }


    schoolData.inbox =
        schoolData.inbox.filter(
            item =>
                item.id !== mailId
        );


    saveData();

    renderPrincipalInbox();

}


/* =====================================================
   DELETE ALL OLD MAILS
===================================================== */

async function deleteAllInbox(){

    if(!schoolData.inbox.length){

        alert(
            "Inbox is already empty."
        );

        return;

    }


    if(
        !confirm(
            "Delete ALL inbox messages and admission photos?"
        )
    ){

        return;

    }


    for(
        const mail of schoolData.inbox
    ){

        if(mail.type === "admission"){

            await deletePhoto(
                mail.studentPhotoId
            );

            await deletePhoto(
                mail.formPhotoId
            );

        }

    }


    schoolData.inbox = [];


    saveData();

    renderPrincipalInbox();


    alert(
        "All old mails have been deleted."
    );

}


/* =====================================================
   PRINCIPAL RENDER
===================================================== */

function renderPrincipal(){

    getEl("principalAbout").value =
        schoolData.about;

    renderPrincipalResources();

    renderPrincipalHomePhotos();

    renderPrincipalTeachers();

    renderPrincipalAdmission();

    renderPrincipalInbox();

}


/* =====================================================
   STAFF RENDER
===================================================== */

function renderStaff(){

    renderStaffStudents();

    renderStaffResults();

    renderStaffTests();

    renderTestMarkSheets();

}


/* =====================================================
   REFRESH EVERYTHING
===================================================== */

function refreshAll(){

    renderHome();

    renderClasses();

    renderTeachers();

    renderResources();

    renderAdmissionStatus();

    if(staffLoggedIn){

        renderStaff();

    }

    if(principalLoggedIn){

        renderPrincipal();

    }

    if(currentStudentId){

        renderStudentTests();

        renderStudentResults();

    }

}


/* =====================================================
   EVENT LISTENERS
===================================================== */

function setupEvents(){


    /* Admission */

    getEl("admissionForm")
        .addEventListener(
            "submit",
            submitAdmission
        );


    /* Contact */

    getEl("contactForm")
        .addEventListener(
            "submit",
            submitContact
        );


    /* Result */

    getEl("resultSearchForm")
        .addEventListener(
            "submit",
            searchResult
        );


    /* Student */

    getEl("studentLoginForm")
        .addEventListener(
            "submit",
            studentLogin
        );


    getEl("studentLogoutButton")
        .addEventListener(
            "click",
            studentLogout
        );


    /* Staff */

    getEl("staffLoginForm")
        .addEventListener(
            "submit",
            staffLogin
        );


    getEl("staffLogoutButton")
        .addEventListener(
            "click",
            staffLogout
        );


    getEl("createStudentButton")
        .addEventListener(
            "click",
            createOrUpdateStudent
        );


    getEl("cancelStudentEditButton")
        .addEventListener(
            "click",
            clearStudentForm
        );


    getEl("addSubjectButton")
        .addEventListener(
            "click",
            ()=>addSubjectInput()
        );


    getEl("saveResultButton")
        .addEventListener(
            "click",
            saveResult
        );


    getEl("addQuestionButton")
        .addEventListener(
            "click",
            addQuestion
        );


    getEl("saveTestButton")
        .addEventListener(
            "click",
            saveTest
        );


    getEl("clearTestButton")
        .addEventListener(
            "click",
            clearTestForm
        );


    /* Principal */

    getEl("principalLoginForm")
        .addEventListener(
            "submit",
            principalLogin
        );


    getEl("principalLogoutButton")
        .addEventListener(
            "click",
            principalLogout
        );


    getEl("saveAboutButton")
        .addEventListener(
            "click",
            saveAbout
        );


    getEl("addResourceButton")
        .addEventListener(
            "click",
            addResource
        );


    getEl("addHomePhotoButton")
        .addEventListener(
            "click",
            addHomePhoto
        );


    getEl("saveClassButton")
        .addEventListener(
            "click",
            saveClass
        );


    getEl("addTeacherButton")
        .addEventListener(
            "click",
            addTeacher
        );


    getEl("publishAnnouncementButton")
        .addEventListener(
            "click",
            publishAnnouncement
        );


    getEl("openAdmissionButton")
        .addEventListener(
            "click",
            openAdmission
        );


    getEl("closeAdmissionButton")
        .addEventListener(
            "click",
            closeAdmission
        );


    getEl("saveAdmissionScheduleButton")
        .addEventListener(
            "click",
            saveAdmissionSchedule
        );


    getEl("changePrincipalPasswordButton")
        .addEventListener(
            "click",
            changePrincipalPassword
        );


    getEl("principalChangeStaffPasswordButton")
        .addEventListener(
            "click",
            changeStaffPassword
        );


    getEl("deleteAllInboxButton")
        .addEventListener(
            "click",
            deleteAllInbox
        );

}


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function(){

        loadData();

        setupTabs();

        setupEvents();

        renderHome();

        renderClasses();

        renderTeachers();

        renderResources();

        renderAdmissionStatus();

        /*
        Give staff an initial subject field.
        */

        addSubjectInput();

        /*
        Give test creator an initial question.
        */

        addQuestion();

    }
);


/* =====================================================
   GLOBAL FUNCTIONS
   Needed because HTML onclick uses them.
===================================================== */

window.editStudent =
    editStudent;

window.deleteStudent =
    deleteStudent;

window.changeStudentStatus =
    changeStudentStatus;

window.editResult =
    editResult;

window.deleteResult =
    deleteResult;

window.deleteTest =
    deleteTest;

window.saveSubmissionMarks =
    saveSubmissionMarks;

window.deleteResource =
    deleteResource;

window.deleteHomePhoto =
    deleteHomePhoto;

window.deleteTeacher =
    deleteTeacher;

window.startStudentTest =
    startStudentTest;

window.deleteInboxMail =
    deleteInboxMail;
