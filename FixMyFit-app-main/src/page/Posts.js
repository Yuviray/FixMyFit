import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../firebase';
import { updateDoc,serverTimestamp,getDoc,doc, addDoc, collection, onSnapshot, orderBy, query, increment } from 'firebase/firestore';
import { db } from '../firebase';
import moment from 'moment';
import './commentBox.css';
import './likeButton.css';
import AliceCarousel from 'react-alice-carousel';
import "react-alice-carousel/lib/alice-carousel.css";
import '@fortawesome/fontawesome-free/css/all.min.css';


const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const currentUser = useAuth();
  const postComments = useRef([]);
  const [userData, setUserData] = useState(null);
  const [commentSubscriptions, setCommentSubscriptions] = useState({});
  const [showComments, setShowComments] = useState({});
  const [isLiked, setIsLiked] = useState(false);

  const getUserData = async () => {
    if (currentUser) {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log(userData.userName);
        setUserData(userData);
      } else {
        console.log("User not found");
      }
    } else {
      console.log("No user is currently logged in");
    }
  }

  useEffect(() => {
    const collectionRef = collection(db, 'post');
    const q = query(collectionRef, orderBy('likes', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setPosts(
        querySnapshot.docs.map((doc) => {
          console.log(doc.data()); // add this line to log the data object
          return {
            ...doc.data(),
            id: doc.id,
            timestamp: doc.data().timestamp?.toDate().getTime(),
            username: doc.data().userName?.userName,
          };
        })
      );
    });

    return unsubscribe;
  }, []);

  const uploadComment = async (postId, postIndex) => {
    if (postComments.current[postIndex].value.trim() !== '') {
      const commentRef = collection(db, 'post', postId, 'comments');
    await addDoc(commentRef, {
      comment: postComments.current[postIndex].value,
      username: userData.userName,
      timestamp: serverTimestamp(),
    });
    postComments.current[postIndex].value = '';
  };
}

  const getComment = async (postId) => {
    const collection2Ref = collection(db, 'post', postId, 'comments');
    const q = query(collection2Ref, orderBy('timestamp', 'desc'));

    // Subscribe to the query and store the subscription
    const subscription = onSnapshot(q, (querySnapshot) => {
      setComments((prevComments) => ({
        ...prevComments,
        [postId]: querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          timestamp: doc.data().timestamp?.toDate().getTime(),
          username: doc.data().username,
          comment: doc.data().comment,
        }))
     }));
    });
    
    setCommentSubscriptions((prevSubscriptions) => ({
      ...prevSubscriptions,
      [postId]: subscription,
    }));
  };

  const toggleComments = (postId) => {
    setShowComments((prevShowComments) => ({
      ...prevShowComments,
      [postId]: !prevShowComments[postId],
    }));
  };

  const updateLikes = async (postId, userId) => {
    const postRef = doc(db, 'post', postId);
    const postSnapshot = await getDoc(postRef);

    if (!postSnapshot.exists()) {
      throw new Error('Post does not exist');
    }

    const post = postSnapshot.data();
    const likes = post.likes || 0;
    const likers = post.likers || [];

    if (likers.includes(userId)) {
      throw new Error('User has already liked this post');
    }

    const updatedLikes = likes + 1;
    const updatedLikers = [...likers, userId];

    await updateDoc(postRef,{
      likes : updatedLikes,
      likers: updatedLikers
    })

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, isLiked: !post.isLiked } : post
      )
    );

  }

  const updateCommentLikes = async (postId, commentId, userId) => {
    const postRef = doc(db, 'post', postId, 'comments', commentId);
    const postSnapshot = await getDoc(postRef);

    if (!postSnapshot.exists()) {
      throw new Error('Post does not exist');
    }

    const post = postSnapshot.data();
    const likes = post.likes || 0;
    const likers = post.likers || [];

    if (likers.includes(userId)) {
      throw new Error('User has already liked this post');
    }

    const updatedLikes = likes + 1;
    const updatedLikers = [...likers, userId];

    await updateDoc(postRef,{
      likes : updatedLikes,
      likers: updatedLikers
    })
  }

  useEffect(() => {
    getUserData();

    // Unsubscribe from all comment subscriptions when component unmounts
    return () => {
      Object.values(commentSubscriptions).forEach((subscription) => subscription());
    };
  }, [currentUser]);

  return (
    <div >
      {posts.map((post, index) => ( 
        <div key={post.id} className='bg-white rounded-lg shadow-xl p-8   mb-4'style={{ marginLeft: "10%", width: 'auto', maxWidth: '500px' ,minWidth: '200px'}}>
          <div className='text-base font-bold'>{post.userName?.userName}</div>
          <AliceCarousel>
            {post.images.map((image, index) => (
              <img key={index} src={image} width={'auto'} />
            ))}
          </AliceCarousel>
              <button className={post.isLiked ? 'button-like liked' : 'button-like'} onClick={() => updateLikes(post.id, currentUser.uid)}>
                <icon className="fas fa-heart"></icon>  
                <span>{post.likes}</span>
              </button>
          <div>
            <span className='text-base p font-bold'>{post.userName?.userName}</span>: {post.post}
          </div>
  
          <input className='comment-box' ref={(el) => (postComments.current[index] = el)} type='text' placeholder='add a comment...' />
          
          
          <div className='container'>
          <button onClick={() => uploadComment(post.id, index)}>post</button>
  
          <button onClick={() => {
            if (commentSubscriptions[post.id]) {
              // unsubscribe from comments if already subscribed
              commentSubscriptions[post.id]();
              setCommentSubscriptions((prevSubscriptions) => ({
                ...prevSubscriptions,
                [post.id]: null,
              }));
            } else {
              // subscribe to comments if not already subscribed
              getComment(post.id);
            }
          }}>{commentSubscriptions[post.id] ? 'hide comments' : 'show comments'}</button>
          </div>
  
          {commentSubscriptions[post.id] && comments[post.id]?.map((comment) => (
            <div key={comment.id} className='bg-gray rounded-lg shadow-xl p-8 w-100 h-auto m-auto mb-4'>
              <div>
                <span className='text-base p font-bold'>{comment.username.userName}</span>: {comment.comment}
                <p className='mt-3 text-xs text-right text-gray-400'>{moment(comment.timestamp).fromNow()}</p>
                <button onClick={() => updateCommentLikes(post.id, comment.id, currentUser.uid)}>{comment.likes} like</button>
              </div>
            </div>
          ))}
  
          <p className='mt-3 text-xs text-right text-gray-400'>{moment(post.timestamp).fromNow()}</p>
        </div>
      ))}
    </div>
  );
};

export default Posts;