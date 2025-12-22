// src/components/firestore/db.js
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "../authContext";
import Link from "next/link";

export default function Db() {
  const [latestClientNames, setLatestClientNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const fetchClients = async () => {
      if (!currentUser || !currentUser.uid) {
        setError("User is not authenticated.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Query to get the latest clients for the authenticated user
        const q = query(
          collection(db, "clients", currentUser.uid, "client"), 
          orderBy("timestamp", "desc"), 
          limit(5)
        );

        const data = await getDocs(q);

        if (isMounted) {
          const clientData = data.docs.map((doc) => ({
            id: doc.id,
            clientName: doc.data().clientName,
          }));

          setLatestClientNames(clientData);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
        if (err.code === "permission-denied") {
          setError("Permission denied. You do not have access to this data.");
        } else {
          setError("An error occurred while fetching client data.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchClients();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  return (
    <div>
      {loading ? (
        <p>Loading clients...</p>
      ) : error ? (
        <p>{error}</p>
      ) : latestClientNames.length > 0 ? (
        latestClientNames.map((client) => (
          <div key={client.id}>
            <Link
              className="hover:underline"
              href={`/${client.clientName}`}
            >
              {client.clientName}
            </Link>
            <br />
          </div>
        ))
      ) : (
        <p>No clients found.</p>
      )}
    </div>
  );
}