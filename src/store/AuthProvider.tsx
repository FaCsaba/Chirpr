import React, {useContext, useState, useEffect} from 'react';
import { auth, db } from '../firebaseSetup';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, collection, updateDoc } from 'firebase/firestore';
import { ChirpUser, userConverter } from './ChirpProvider';

interface CurrentUserI {
    auth: User|null,  
    chirprInfo: ChirpUser|undefined 
}

interface AuthContextI {
    isLoadingCurrentUser: boolean,
    currentUser?: CurrentUserI,
    login?: (email: string, password: string, successCallback: (user: User) => void, failCallback: (reason: any) => void) => void
    logout?: () => void
    register?: (email: string, password: string, successCallback: (user: User) => string, failCallback: (reason: any) => void) => void,
    sendChirp?: (textcontent: string, imgcontent: string[]) => void
    sendBlurb: (blurb: string) => void
    sendUsername: (username: string) => void
    sendProfilePicture: (profilePicture: string) => void
}

const AuthContext = React.createContext<AuthContextI>({isLoadingCurrentUser: true, sendBlurb: ()=>{}, sendUsername: ()=>{}, sendProfilePicture: ()=>{}})

export function useAuth() {
    return useContext(AuthContext)
}

function cleanErrorReason(reason: string) {
    return reason.split('/')[1]
}

export default function AuthProvider({children}: {children: JSX.Element}) {
    const [currentUser, setCurrentUser] = useState<CurrentUserI|undefined>()
    const [isLoading, setIsLoading] = useState<boolean>(true)


    function register(email: string, password: string, successCallback: (user: User) => string, failCallback: (reason: any) => void) {
        createUserWithEmailAndPassword(auth, email, password)
            .then((user)=> {
                const chirpHandle = successCallback(user.user)
                return setDoc(doc(db, 'users', user.user.uid), {amountOfChirps: 0, chirpHandle: encodeURIComponent(chirpHandle), chirps: [], pic: user.user.photoURL || 'https://moonvillageassociation.org/wp-content/uploads/2018/06/default-profile-picture1.jpg', username: chirpHandle, createdAt: Timestamp.now(), blurb: ''})
            }, (reason)=>{
                failCallback(cleanErrorReason(reason.code))
            })
            .catch((reason)=>{
                console.error(reason)
            })
    }

    function login(email: string, password: string, successCallback: (user: User) => void, failCallback: (reason: any) => void) {
        signInWithEmailAndPassword(auth, email, password)
            .then((user)=>{
                successCallback(user.user)
            })
            .catch((reason)=>{
                console.error(reason.code)
                failCallback(cleanErrorReason(reason.code))
        
            })
    }

    function logout() {
        signOut(auth)
    }

    function sendChirp(textcontent: string, imgcontent: string[]) {
        if (currentUser?.chirprInfo && currentUser.auth?.uid) {
            setDoc(doc(collection(db, 'chirps')), {imgcontent, textcontent, timestamp: Timestamp.now(), user: currentUser.auth.uid})
                .catch((reason)=>{
                    console.error(reason)
                })
        }
    }

    function sendBlurb(blurb: string) {
        if (currentUser?.chirprInfo && currentUser.auth?.uid) {
            updateDoc(doc(collection(db, 'users'), currentUser.auth.uid), {blurb: blurb})
        }
    }

    function sendUsername(username: string) {
        if (currentUser?.chirprInfo && currentUser.auth?.uid) {
            updateDoc(doc(collection(db, 'users'), currentUser.auth.uid), {username: username})
        }
    }

    function sendProfilePicture(profilePicture: string) {
        if (currentUser?.chirprInfo && currentUser.auth?.uid) {
            updateDoc(doc(collection(db, 'users'), currentUser.auth.uid), {pic: profilePicture})
        }
    }

    useEffect(()=>{
        const unsub = auth.onAuthStateChanged((user: User | null) => {
            if (user) {
                setIsLoading(false)
                return getDoc(doc(db, 'users', user.uid ).withConverter(userConverter)).then((chirprUser)=>{setCurrentUser({auth: user, chirprInfo: chirprUser.data()})})}
            else setCurrentUser({auth: user, chirprInfo: undefined})
            return setIsLoading(false)
        })

        return unsub
    }, [])


    const value: AuthContextI = {
        currentUser,
        register,
        login,
        logout,
        isLoadingCurrentUser: isLoading,
        sendChirp,
        sendBlurb,
        sendUsername,
        sendProfilePicture
    }

    return <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
}
