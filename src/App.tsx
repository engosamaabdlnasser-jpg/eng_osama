import {BrowserRouter,Routes,Route} from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Categories from './pages/Categories';
import CourseDetails from './pages/CourseDetails';
import Lesson from './pages/Lesson';
import { ForgotPassword, Login, ResetPassword, Signup } from './pages/Auth';
import Account from './pages/Account';
import Admin from './pages/Admin';
import AdminCourse from './pages/AdminCourse';
import './styles/global.css';
import { ThemeProvider } from './components/ThemeProvider';

function NotFound(){return <div className="container section"><div className="surface empty"><span className="tag">404</span><h1>الصفحة غير موجودة</h1><p className="muted">الرابط الذي فتحته غير متاح.</p><a className="btn btn-primary" href="/">العودة للرئيسية</a></div></div>}

export default function App(){return <ThemeProvider><BrowserRouter><Routes><Route element={<AppLayout/>}><Route path="/" element={<Home/>}/><Route path="/courses" element={<Courses/>}/><Route path="/categories" element={<Categories/>}/><Route path="/courses/:id" element={<CourseDetails/>}/><Route path="/courses/:courseId/lessons/:lessonId" element={<Lesson/>}/><Route path="/login" element={<Login/>}/><Route path="/signup" element={<Signup/>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/reset-password" element={<ResetPassword/>}/><Route path="/account" element={<Account/>}/><Route path="/admin" element={<Admin/>}/><Route path="/admin/courses/new" element={<AdminCourse/>}/><Route path="/admin/courses/:id/edit" element={<AdminCourse/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></BrowserRouter></ThemeProvider>}
