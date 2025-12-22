"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/firebase/firebase";
import { getDocs, collection, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/components/authContext";

export default function DropdownMenu() {
  const [clients, setClients] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentUser } = useAuth(); // Lämna detta som det är
  const router = useRouter();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        if (currentUser) {
          const q = query(
            collection(db, "clients", currentUser.uid, "client"),
            orderBy("clientName")
          );

          const data = await getDocs(q);

          const clientData = data.docs.map((doc) => doc.id);
          setClients(clientData);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchClients();
  }, [currentUser]);

  const toggleDropDown = () => {
    setIsOpen(!isOpen);
  };

  const handleClientSelection = (clientName) => {
    setSelectedClients((prevSelectedClients) => {
      const updatedSelectedClients = [...prevSelectedClients];

      if (updatedSelectedClients.includes(clientName)) {
        const index = updatedSelectedClients.indexOf(clientName);
        updatedSelectedClients.splice(index, 1);
      } else {
        updatedSelectedClients.push(clientName);
      }

      return updatedSelectedClients;
    });

    // Move the router.push outside the render function
    const navigateToClient = async () => {
      router.push(`/[clientName]`, `/${clientName}`);
    };

    navigateToClient();
  };

  const filteredClients = clients.filter((clientName) =>
    clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className={`flex flex-col items-center bg-slate-200 rounded-md px-4 py-1 transition-all duration-500 ease-in-out `}
    >
      <button
        className={`flex px-4 w-full items-center  ${isOpen ? "mb-2" : "mb-0"}`}
        onClick={toggleDropDown}
      >
        <span className="flex-1"> All Clients</span>
        <span
          className={`transition-transform duration-500 ease ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="flex flex-col w-full ">
          <input
            className="py-1 mb-2 w-full rounded-md"
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {filteredClients.map((clientName) => (
            <Link
              href={`/[clientName]`}
              as={`/${clientName}`}
              key={clientName}
              passHref
            >
              <div
                className="flex items-center justify-between border-b rounded-sm border-gray-100 hover:bg-slate-50 hover:rounded-md cursor-pointer"
                onClick={() => handleClientSelection(clientName)}
              >
                <p className="p-2">{clientName}</p>
                <div
                // className={`p-2 border rounded-md ${
                //   selectedClients.includes(clientName)
                //     ? "bg-gray-300 py-1"
                //     : "bg-gray-700"
                // }`}
                >
                  {selectedClients.includes(clientName)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
