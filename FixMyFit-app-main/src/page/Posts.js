import React, { useEffect, useState } from 'react';
import {  collection, onSnapshot,orderBy,query } from 'firebase/firestore';
import { db } from "../firebase";
import Image from 'next/image'

const Posts = () => {
    const[posts, setPosts] = useState([])
    useEffect(()=>{
        const collectionRef = collection(db,"post")
        const q = query(collectionRef,orderBy("timestamp","desc"))
        const unsubscribe = onSnapshot(q, (querySnapshot)=>{
            setPosts(querySnapshot.docs.map(doc => ({...doc.data(),id: doc.id, timestamp: doc.data().timestamp?.toDate().getTime() })))
        })

        return unsubscribe
    },[])

    return(
        <div>{
            posts.map(post=><div key={post.id}>
                <div className='text-lg'>{post.post}</div>
            </div>)
        }</div>
    )
}
 export default Posts;
