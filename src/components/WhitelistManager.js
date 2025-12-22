"use client";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { toast } from "react-toastify";

export default function WhitelistManager() {
  const [newEmail, setNewEmail] = useState("");
  const [whitelistedEmails, setWhitelistedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWhitelistedEmails();
  }, []);

  const fetchWhitelistedEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const whitelistRef = collection(db, "whitelist");
      const querySnapshot = await getDocs(whitelistRef);
      const emails = querySnapshot.docs.map((doc) => doc.id);
      setWhitelistedEmails(emails);
    } catch (error) {
      console.error("Error fetching whitelist:", error);
      setError("Error loading whitelist");
      toast.error("Error loading whitelist");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      setError(null);
      const email = newEmail.toLowerCase().trim();

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address");
        return;
      }

      // Check if email already exists
      if (whitelistedEmails.includes(email)) {
        setError("This email is already whitelisted");
        return;
      }

      await setDoc(doc(db, "whitelist", email), {
        addedAt: new Date().toISOString(),
        addedBy: "system",
      });

      setWhitelistedEmails((prev) => [...prev, email]);
      setNewEmail("");
      toast.success("Email added to whitelist");
    } catch (error) {
      console.error("Error adding email to whitelist:", error);
      setError("Error adding email to whitelist");
      toast.error("Error adding email to whitelist");
    }
  };

  const handleRemoveEmail = async (email) => {
    try {
      setError(null);
      await deleteDoc(doc(db, "whitelist", email));
      setWhitelistedEmails((prev) => prev.filter((e) => e !== email));
      toast.success("Email removed from whitelist");
    } catch (error) {
      console.error("Error removing email from whitelist:", error);
      setError("Error removing email from whitelist");
      toast.error("Error removing email from whitelist");
    }
  };

  if (loading) {
    return (
      <div className="mt-8 p-6 bg-white rounded-lg shadow">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Manage Whitelist</h2>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <form
        onSubmit={handleAddEmail}
        className="mb-6">
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email to whitelist"
            className="flex-1 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Add Email
          </button>
        </div>
      </form>

      <div className="space-y-2">
        <h3 className="font-semibold">Whitelisted Emails:</h3>
        {whitelistedEmails.length === 0 ? (
          <p className="text-gray-500">No whitelisted emails</p>
        ) : (
          <ul className="space-y-2">
            {whitelistedEmails.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{email}</span>
                <button
                  onClick={() => handleRemoveEmail(email)}
                  className="text-red-500 hover:text-red-700">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
