// Firebase SDK (Module Imports)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCVbvw2Tj5rxKhsG7JYfvBXVAwGgaULyMY",
  authDomain: "nexusverse-ce94f.firebaseapp.com",
  projectId: "nexusverse-ce94f",
  storageBucket: "nexusverse-ce94f.firebasestorage.app",
  messagingSenderId: "481484791977",
  appId: "1:481484791977:web:b39792bbc9f8203a2349b8",
  measurementId: "G-2ZMNLGCZMP"
};

// Initialize Firebase & Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Notification state is stored per browser profile and account, so a visitor's
// read/unread choice never changes the notification for everybody else.
const notifButton = document.getElementById('notifBtn');
const notifPanel = document.getElementById('notificationPanel');
const notifList = document.getElementById('notificationList');
const notifCount = document.getElementById('notifCount');
const markNotificationsRead = document.getElementById('markNotificationsRead');
const announcementBanner = document.getElementById('announcementBanner');
const announcementText = document.getElementById('announcementText');
const dismissAnnouncement = document.getElementById('dismissAnnouncement');
const notificationToastRegion = document.getElementById('notificationToastRegion');
const commentGame = document.getElementById('commentGame');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentList = document.getElementById('commentList');
const commentStatus = document.getElementById('commentStatus');
const commentLoginNote = document.getElementById('commentLoginNote');
const commentSubmit = document.getElementById('commentSubmit');
let commentsUnsubscribe = null;
let notifications = [];
let notificationsLoaded = false;
let notificationError = false;

const readStorageKey = () => `nexusverse-read-notifications-${auth.currentUser?.uid || 'guest'}`;
const getReadNotificationIds = () => {
  try {
    const value = JSON.parse(localStorage.getItem(readStorageKey()) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
};
const saveReadNotificationIds = ids => {
  try { localStorage.setItem(readStorageKey(), JSON.stringify([...ids])); } catch { /* Storage may be disabled. */ }
};
const showNotificationToast = item => {
  if (!notificationToastRegion) return;
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  const title = document.createElement('strong');
  title.textContent = item.title || 'NexusVerse update';
  const message = document.createElement('span');
  message.textContent = item.message || '';
  toast.append(title, message);
  notificationToastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 6000);
};
const notificationDate = value => {
  if (!value) return null;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const gameCommentIds = {
  'Flappy Bird': 'flappy-bird', 'Pixel Battle': 'pixel-battle',
  'Cyber Blade': 'cyber-blade', 'Spellcaster Arena': 'spellcaster-arena',
  'Cyber Space Shooter': 'cyber-space-shooter'
};
const supportedCommentGames = new Set(Object.values(gameCommentIds));
const loadComments = gameId => {
  if (!commentList || !supportedCommentGames.has(gameId)) return;
  commentsUnsubscribe?.();
  commentList.replaceChildren(Object.assign(document.createElement('p'), { className: 'comment-empty', textContent: 'Loading comments…' }));
  commentsUnsubscribe = onSnapshot(query(collection(db, 'comments'), where('gameId', '==', gameId)), snapshot => {
    const items = snapshot.docs.map(item => ({ ...item.data(), id: item.id }))
      .sort((a, b) => (notificationDate(b.createdAt)?.getTime() || 0) - (notificationDate(a.createdAt)?.getTime() || 0));
    commentList.replaceChildren();
    if (!items.length) {
      commentList.append(Object.assign(document.createElement('p'), { className: 'comment-empty', textContent: 'No comments yet. Start the conversation!' }));
      return;
    }
    items.slice(0, 50).forEach(item => {
      const card = document.createElement('article');
      card.className = 'comment-card';
      const heading = document.createElement('div');
      heading.className = 'comment-meta';
      const author = document.createElement('strong');
      author.textContent = item.authorName || 'Player';
      const date = notificationDate(item.createdAt);
      const time = document.createElement('time');
      if (date) {
        time.dateTime = date.toISOString();
        time.textContent = date.toLocaleString();
      }
      heading.append(author, time);
      const body = document.createElement('p');
      body.textContent = item.text || '';
      card.append(heading, body);
      commentList.append(card);
    });
  }, error => {
    console.error('Comments listener failed:', error);
    commentList.replaceChildren(Object.assign(document.createElement('p'), { className: 'comment-empty', textContent: 'Comments could not load. Check Firestore rules and refresh.' }));
  });
};
if (commentGame) {
  commentGame.addEventListener('change', () => loadComments(commentGame.value));
  window.selectCommentGame = title => {
    const id = gameCommentIds[title];
    if (!id) return;
    commentGame.value = id;
    loadComments(id);
  };
  loadComments(commentGame.value);
}
commentForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const user = auth.currentUser;
  const text = commentInput.value.trim();
  if (!user) {
    commentStatus.textContent = 'Please sign in before posting.';
    window.openAuthModal?.();
    return;
  }
  if (!text || text.length > 500) return;
  commentSubmit.disabled = true;
  commentStatus.textContent = 'Posting…';
  try {
    await addDoc(collection(db, 'comments'), {
      gameId: commentGame.value,
      text,
      authorId: user.uid,
      authorName: (user.displayName || user.email?.split('@')[0] || 'Player').slice(0, 40),
      createdAt: serverTimestamp()
    });
    commentInput.value = '';
    commentStatus.textContent = 'Comment posted.';
  } catch (error) {
    console.error('Comment post failed:', error);
    commentStatus.textContent = 'Could not post. Check Firestore rules and try again.';
  } finally {
    commentSubmit.disabled = false;
  }
});
const renderNotifications = () => {
  if (!notifList || !notifCount) return;
  const readIds = getReadNotificationIds();
  const visible = notifications
    .filter(item => item.userId === 'all' || (auth.currentUser && item.userId === auth.currentUser.uid))
    .sort((a, b) => (notificationDate(b.timestamp)?.getTime() || 0) - (notificationDate(a.timestamp)?.getTime() || 0))
    .slice(0, 30);
  const unreadCount = visible.reduce((count, item) => count + (readIds.has(item.id) ? 0 : 1), 0);
  notifCount.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
  notifCount.hidden = unreadCount === 0;
  notifList.replaceChildren();

  const announcement = visible.find(item => item.type === 'announcement' && !readIds.has(item.id));
  if (announcementBanner && announcementText) {
    announcementBanner.hidden = !announcement;
    announcementText.textContent = announcement ? `${announcement.title || 'NexusVerse announcement'}: ${announcement.message || ''}` : '';
    if (dismissAnnouncement) dismissAnnouncement.dataset.notificationRead = announcement?.id || '';
  }

  if (notificationError) {
    const message = document.createElement('p');
    message.className = 'notification-empty';
    message.textContent = 'Notifications could not be loaded. Check the Firestore access rules and try again.';
    notifList.append(message);
    return;
  }
  if (!notificationsLoaded) {
    const message = document.createElement('p');
    message.className = 'notification-empty';
    message.textContent = 'Loading notifications…';
    notifList.append(message);
    return;
  }
  if (!visible.length) {
    const message = document.createElement('p');
    message.className = 'notification-empty';
    message.textContent = 'You’re all caught up. New game announcements will appear here.';
    notifList.append(message);
    return;
  }

  visible.forEach(item => {
    const entry = document.createElement('article');
    const isRead = readIds.has(item.id);
    entry.className = `notification-item${isRead ? '' : ' unread'}`;
    const title = document.createElement('h3');
    title.textContent = item.title || 'NexusVerse update';
    const body = document.createElement('p');
    body.textContent = item.message || '';
    entry.append(title, body);
    const date = notificationDate(item.timestamp);
    if (date) {
      const time = document.createElement('time');
      time.dateTime = date.toISOString();
      time.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      entry.append(time);
    }
    if (!isRead) {
      const markRead = document.createElement('button');
      markRead.type = 'button';
      markRead.dataset.notificationRead = item.id;
      markRead.textContent = 'Mark read';
      markRead.setAttribute('aria-label', `Mark ${item.title || 'notification'} as read`);
      entry.append(markRead);
    }
    notifList.append(entry);
  });
};

if (notifButton && notifPanel && notifList) {
  notifButton.addEventListener('click', () => {
    const isOpening = notifPanel.hidden;
    notifPanel.hidden = !isOpening;
    notifButton.setAttribute('aria-expanded', String(isOpening));
  });
  notifList.addEventListener('click', event => {
    const button = event.target.closest('[data-notification-read]');
    if (!button) return;
    const ids = getReadNotificationIds();
    ids.add(button.dataset.notificationRead);
    saveReadNotificationIds(ids);
    renderNotifications();
  });
  markNotificationsRead?.addEventListener('click', () => {
    const ids = getReadNotificationIds();
    notifications.forEach(item => {
      if (item.userId === 'all' || (auth.currentUser && item.userId === auth.currentUser.uid)) ids.add(item.id);
    });
    saveReadNotificationIds(ids);
    renderNotifications();
  });
  dismissAnnouncement?.addEventListener('click', () => {
    const id = dismissAnnouncement.dataset.notificationRead;
    if (!id) return;
    const ids = getReadNotificationIds();
    ids.add(id);
    saveReadNotificationIds(ids);
    renderNotifications();
  });
  document.addEventListener('click', event => {
    if (!notifPanel.hidden && !event.target.closest('.notification-wrap')) {
      notifPanel.hidden = true;
      notifButton.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !notifPanel.hidden) {
      notifPanel.hidden = true;
      notifButton.setAttribute('aria-expanded', 'false');
      notifButton.focus();
    }
  });
  onSnapshot(query(collection(db, 'notifications'), where('userId', '==', 'all')), snapshot => {
    const incoming = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    if (notificationsLoaded) {
      const knownIds = new Set(notifications.map(item => item.id));
      incoming.filter(item => !knownIds.has(item.id) && item.type === 'new_game').forEach(showNotificationToast);
    }
    notifications = incoming;
    notificationsLoaded = true;
    notificationError = false;
    renderNotifications();
  }, error => {
    console.error('Notifications listener failed:', error);
    notificationsLoaded = true;
    notificationError = true;
    renderNotifications();
  });
}

// Modal Functions
window.openAuthModal = () => {
  const modal = document.getElementById('authModal');
  if(modal) modal.style.display = 'flex';
};

window.closeAuthModal = () => {
  const modal = document.getElementById('authModal');
  if(modal) modal.style.display = 'none';
};

// Helper function to safely get input value from multiple possible ID names
const getInputValue = (id1, id2) => {
  const el = document.getElementById(id1) || document.getElementById(id2);
  return el ? el.value.trim() : '';
};

// 1. Email Sign Up
window.signUpEmail = async () => {
  const email = getInputValue('authEmail', 'email');
  const password = getInputValue('authPassword', 'password');
  
  if(!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert('Account created successfully!');
    window.closeAuthModal();
  } catch (error) {
    alert('Sign Up Error: ' + error.message);
  }
};

// 2. Email Login
window.loginEmail = async () => {
  const email = getInputValue('authEmail', 'email');
  const password = getInputValue('authPassword', 'password');

  if(!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert('Logged in successfully!');
    window.closeAuthModal();
  } catch (error) {
    alert('Login Error: ' + error.message);
  }
};

// 3. Google OAuth Login
window.loginGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
    window.closeAuthModal();
  } catch (error) {
    alert('Google Auth Error: ' + error.message);
  }
};

// 4. Logout Function
window.logout = () => signOut(auth);

// 5. Forgot Password — sends the user to the reset-password page
window.forgotPassword = () => {
  window.location.href = 'forgot-password.html';
};

// 5. Active User Listener
onAuthStateChanged(auth, (user) => {
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const userProfile = document.getElementById('userProfile');
  const userName = document.getElementById('userName');

  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (userProfile) userProfile.style.display = 'inline-block';
    if (userName) userName.innerText = user.displayName || user.email.split('@')[0];
    if (commentLoginNote) commentLoginNote.textContent = `Posting as ${user.displayName || user.email.split('@')[0]}.`;
    if (commentInput) commentInput.disabled = false;
    if (commentSubmit) commentSubmit.disabled = false;
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (signupBtn) signupBtn.style.display = 'inline-block';
    if (userProfile) userProfile.style.display = 'none';
    if (commentLoginNote) commentLoginNote.textContent = 'Sign in to post a comment. Comments are visible to everyone.';
    if (commentInput) commentInput.disabled = true;
    if (commentSubmit) commentSubmit.disabled = true;
  }
  renderNotifications();
});
