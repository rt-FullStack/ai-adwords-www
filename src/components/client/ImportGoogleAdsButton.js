import React, { useState, useRef } from "react";
import Button from "@/components/buttons";
import Toast from "@/components/Toast";
import { db } from "@/firebase/firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc, getDocs, deleteDoc } from "firebase/firestore";
import { FaFileImport, FaGoogle, FaTimes, FaCheckCircle, FaClock } from "react-icons/fa";
import GoogleAdsLogin from "./GoogleAdsLogin";

// Guidance Modal Component
const GuidanceModal = ({ isOpen, onClose, title, guidance, icon: Icon }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full m-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <FaTimes size={20} />
        </button>
        <div className="flex items-center mb-4">
          {Icon && (
            <div className="mr-3">
              <Icon size={24} className={Icon === FaCheckCircle ? "text-green-500" : Icon === FaClock ? "text-blue-500" : ""} />
            </div>
          )}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <div className="mt-4">
          {guidance.split('\n').map((line, index) => (
            line.trim() && (
              <p
                key={index}
                className={`mb-2 ${index === 0 ? 'text-gray-700' : 'text-gray-600'}`}>
                {line.trim()}
              </p>
            )
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ImportGoogleAdsButton({ currentUser, onUpdate, onUpdateComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [expandedClients, setExpandedClients] = useState({});
  const [importProgress, setImportProgress] = useState([]);
  const [showProgress, setShowProgress] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [invitingClients, setInvitingClients] = useState({});
  const [guidanceModal, setGuidanceModal] = useState({ isOpen: false, title: "", guidance: "", icon: null });
  const abortController = useRef(null);
  const importedRefs = useRef([]);

  const showToastMessage = (message, isError = false) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const normalizeStatus = (status) => {
    if (!status || status.trim() === "") {
      return "Active";
    }
    return status === "ENABLED" ? "Active" : status === "PAUSED" ? "Paused" : status;
  };

  const addProgressLog = (message) => {
    setImportProgress((prev) => {
      const newLogs = [...prev, { message, timestamp: new Date().toLocaleTimeString() }];
      setTimeout(() => {
        const progressContainer = document.getElementById("progress-container");
        if (progressContainer) {
          progressContainer.scrollTop = progressContainer.scrollHeight;
        }
      }, 0);
      return newLogs;
    });
  };

  const handleCancel = async () => {
    if (isImporting) {
      if (abortController.current) {
        abortController.current.abort();
      }
      addProgressLog("❌ Import cancelled by user");

      addProgressLog("🧹 Cleaning up imported items...");
      try {
        for (const ref of importedRefs.current) {
          await deleteDoc(ref);
        }
        addProgressLog("✅ Cleanup completed");
      } catch (error) {
        console.error("Error during cleanup:", error);
        addProgressLog("⚠️ Error during cleanup");
      }

      importedRefs.current = [];
      setIsImporting(false);
    }

    setIsModalOpen(false);
    setShowProgress(false);
    setImportProgress([]);
  };

  const handleLoginSuccess = async () => {
    await fetchAvailableClients();
  };

  const showGuidanceModal = (title, guidance, icon) => {
    setGuidanceModal({
      isOpen: true,
      title,
      guidance,
      icon
    });
  };

  const handleInvite = async (client) => {
    setInvitingClients(prev => ({ ...prev, [client.id]: true }));
    try {
      const response = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/send-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ clientId: client.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        if (data.alreadyLinked) {
          showToastMessage(`${client.name} is already linked`, false);
          showGuidanceModal(
            "Account Already Linked",
            `The account "${client.name}" is already linked to your manager account. You can proceed with importing data.`,
            FaCheckCircle
          );
        } else if (data.pending) {
          showToastMessage(data.message, false);
          showGuidanceModal(
            "Pending Invitation",
            data.guidance,
            FaClock
          );
        } else {
          showToastMessage(data.message, false);
          showGuidanceModal(
            "Invitation Sent Successfully",
            data.guidance,
            FaCheckCircle
          );
        }
      } else {
        throw new Error(data.message || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      showToastMessage(`Error sending invitation to ${client.name}: ${error.message}`, true);
    } finally {
      setInvitingClients(prev => ({ ...prev, [client.id]: false }));
    }
  };

  const fetchAvailableClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/accounts", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAvailableClients(data.accounts || []);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setError(error.message);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    abortController.current = new AbortController();

    if (!currentUser || selectedClients.length === 0) {
      showToastMessage("Please select at least one client to import", true);
      setIsImporting(false);
      return;
    }

    setIsLoading(true);
    setShowProgress(true);
    setImportProgress([]);

    try {
      for (const client of selectedClients) {
        const clientName = client.name;
        addProgressLog(`🔄 Starting import for client: ${clientName} (${client.id})`);

        const clientRef = doc(db, "clients", currentUser.uid, "client", clientName);
        await setDoc(clientRef, {
          name: clientName,
          clientStatus: "enabled",
          timestamp: serverTimestamp(),
          googleAdsId: client.id,
        });
        importedRefs.current.push(clientRef);
        addProgressLog(`✅ Created client: ${clientName} with Google Ads ID: ${client.id}`);

        addProgressLog(`🔍 Fetching campaigns for ${clientName}...`);
        const campaignsResponse = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/fetch-campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: client.id }),
          signal: abortController.current.signal,
        });

        const campaignsData = await campaignsResponse.json();

        if (campaignsData.campaigns && campaignsData.campaigns.length > 0) {
          addProgressLog(`📊 Processing ${campaignsData.campaigns.length} campaigns...`);
          for (const campaign of campaignsData.campaigns) {
            const campaignRef = doc(clientRef, "adGroups", campaign.name);
            await setDoc(campaignRef, {
              name: campaign.name,
              adGroupName: campaign.name,
              campaignStatus: normalizeStatus(campaign.status),
              timestamp: serverTimestamp(),
            });
            importedRefs.current.push(campaignRef);

            addProgressLog(`🔍 Fetching ad groups for campaign: ${campaign.name}`);
            const adGroupsResponse = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/fetch-adgroups", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientId: client.id,
                campaignId: campaign.id,
              }),
              signal: abortController.current.signal,
            });

            const adGroupsData = await adGroupsResponse.json();

            if (adGroupsData.adGroups && adGroupsData.adGroups.length > 0) {
              addProgressLog(`📊 Processing ${adGroupsData.adGroups.length} ad groups...`);
              for (const adGroup of adGroupsData.adGroups) {
                const adGroupRef = doc(campaignRef, "adTypes", adGroup.name);
                await setDoc(adGroupRef, {
                  name: adGroup.name,
                  adGroupStatus: normalizeStatus(adGroup.status),
                  timestamp: serverTimestamp(),
                });
                importedRefs.current.push(adGroupRef);

                addProgressLog(`🔍 Fetching ads for ad group: ${adGroup.name}`);
                const adsResponse = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/fetch-ads", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    clientId: client.id,
                    adGroupId: adGroup.id,
                  }),
                  signal: abortController.current.signal,
                });

                const adsData = await adsResponse.json();

                if (adsData.ads && adsData.ads.length > 0) {
                  addProgressLog(`📊 Processing ${adsData.ads.length} ads...`);
                  for (const ad of adsData.ads) {
                    const adName = ad.headlines[0]?.text || `Ad ${ad.id}`;
                    const adRef = doc(adGroupRef, "categories", adName);

                    const headlineValues = ad.headlines.map((h) => ({
                      text: h.text || "",
                      pin: h.pinned?.match(/\d+$/)?.[0] || "",
                      id: `headline-id-${Math.random().toString(36).substr(2, 9)}`,
                    }));

                    const descriptionValues = ad.descriptions.map((d) => ({
                      text: d.text || "",
                      pin: d.pinned?.match(/\d+$/)?.[0] || "",
                      id: `description-id-${Math.random().toString(36).substr(2, 9)}`,
                    }));

                    await setDoc(adRef, {
                      categoryName: adName,
                      name: adName,
                      adStatus: normalizeStatus(ad.status),
                      headlineValues,
                      descriptionValues,
                      pathValues: [
                        { text: ad.path1 || "", id: `path-id-1` },
                        { text: ad.path2 || "", id: `path-id-2` },
                      ],
                      finalUrlValues: [{ text: ad.finalUrl || "" }],
                      labelsValues: [],
                      timestamp: serverTimestamp(),
                      googleAdsId: ad.id,
                    });
                    importedRefs.current.push(adRef);
                    addProgressLog(`  ✓ Imported ad "${adName}" with ID: ${ad.id}`);
                  }
                }
              }
            }
          }
        }

        await handleImportComplete(clientName);
        addProgressLog(`✅ Completed import for ${clientName}`);
      }

      addProgressLog(`🎉 Successfully imported all selected clients!`);
      showToastMessage("Import successful!");
      onUpdate();

      setTimeout(() => {
        setShowProgress(false);
        setIsModalOpen(false);
        setImportProgress([]);
      }, 3000);
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Import was cancelled");
      } else {
        console.error("Error importing from Google Ads:", error);
        addProgressLog(`❌ Error: ${error.message || "Failed to import from Google Ads"}`);
        showToastMessage("Error importing from Google Ads", true);
      }
    } finally {
      setIsLoading(false);
      setIsImporting(false);
      setSelectedClients([]);
    }
  };

  const handleImportComplete = async (importedClientName) => {
    try {
      // Get fresh data for the imported client
      const clientRef = doc(db, "clients", currentUser.uid, "client", importedClientName);
      const clientDoc = await getDoc(clientRef);

      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        const adGroupsRef = collection(clientRef, "adGroups");
        const adGroupsSnapshot = await getDocs(adGroupsRef);

        const adGroups = await Promise.all(
          adGroupsSnapshot.docs.map(async (adGroupDoc) => {
            const adGroupData = adGroupDoc.data();
            const adTypesRef = collection(adGroupDoc.ref, "adTypes");
            const adTypesSnapshot = await getDocs(adTypesRef);

            const adTypes = await Promise.all(
              adTypesSnapshot.docs.map(async (adTypeDoc) => {
                const adTypeData = adTypeDoc.data();
                const categoriesRef = collection(adTypeDoc.ref, "categories");
                const categoriesSnapshot = await getDocs(categoriesRef);

                return {
                  id: adTypeDoc.id,
                  name: adTypeData.name || adTypeDoc.id,
                  adGroupStatus: adTypeData.adGroupStatus || "enabled",
                  categories: categoriesSnapshot.docs.map((categoryDoc) => {
                    const categoryData = categoryDoc.data();
                    return {
                      id: categoryDoc.id,
                      categoryName: categoryData.categoryName || categoryDoc.id,
                      adStatus: categoryData.adStatus || "enabled",
                      headlineValues: categoryData.headlineValues || [],
                      descriptionValues: categoryData.descriptionValues || [],
                      pathValues: categoryData.pathValues || [],
                      finalUrlValues: categoryData.finalUrlValues || [],
                      labelsValues: categoryData.labelsValues || [],
                      googleAdsId: categoryData.googleAdsId || null,
                    };
                  }),
                };
              })
            );

            return {
              id: adGroupDoc.id,
              name: adGroupData.adGroupName || adGroupDoc.id,
              campaignStatus: adGroupData.campaignStatus || "enabled",
              adTypes,
            };
          })
        );

        // Create the updated client object
        const updatedClient = {
          id: importedClientName,
          name: importedClientName,
          clientStatus: clientData.clientStatus || "enabled",
          adGroups,
        };

        // Update the clients state
        onUpdateComplete((prevClients) => {
          const clientExists = prevClients.some((c) => c.name === importedClientName);
          if (clientExists) {
            return prevClients.map((c) => (c.name === importedClientName ? updatedClient : c));
          } else {
            return [...prevClients, updatedClient];
          }
        });

        // Expand the imported client node
        setExpandedClients((prev) => ({ ...prev, [importedClientName]: true }));
      }
    } catch (error) {
      console.error("Error refreshing imported client data:", error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md"
        title="Import from Google Ads">
        <FaGoogle size={18} />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Import from Google Ads</h2>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700">
                <FaTimes size={20} />
              </button>
            </div>

            {!isAuthenticated ? (
              <GoogleAdsLogin
                onLoginSuccess={handleLoginSuccess}
                isAuthenticated={false}
              />
            ) : (
              <>
                {isLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : showProgress ? (
                  <div
                    id="progress-container"
                    className="space-y-2 font-mono text-sm h-48 overflow-y-auto">
                    {importProgress.map((log, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2">
                        <span className="text-gray-500 text-xs">{log.timestamp}</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <GoogleAdsLogin
                        onLoginSuccess={handleLoginSuccess}
                        isAuthenticated={true}
                      />
                    </div>
                    {availableClients.length > 0 && (
                      <div className="space-y-2 mb-6">
                        {availableClients.map((client) => (
                          <div
                            key={client.id}
                            className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              id={client.id}
                              checked={selectedClients.some((c) => c.id === client.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClients([...selectedClients, client]);
                                } else {
                                  setSelectedClients(selectedClients.filter((c) => c.id !== client.id));
                                }
                              }}
                              className="mr-2"
                            />
                            <label
                              htmlFor={client.id}
                              className="flex-1">
                              {client.name}
                            </label>
                            <button
                              onClick={() => handleInvite(client)}
                              disabled={invitingClients[client.id]}
                              className={`ml-2 px-3 py-1 text-sm rounded ${invitingClients[client.id]
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : "bg-blue-500 text-white hover:bg-blue-600"
                                }`}>
                              {invitingClients[client.id] ? "Sending..." : "Send Invite"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-4">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800">
                        Cancel
                      </button>
                      <button
                        onClick={handleImport}
                        disabled={selectedClients.length === 0 || isImporting}
                        className={`px-4 py-2 rounded ${selectedClients.length === 0 || isImporting
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}>
                        {isImporting ? "Importing..." : "Import Selected"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <GuidanceModal
        isOpen={guidanceModal.isOpen}
        onClose={() => setGuidanceModal(prev => ({ ...prev, isOpen: false }))}
        title={guidanceModal.title}
        guidance={guidanceModal.guidance}
        icon={guidanceModal.icon}
      />

      {showToast && (
        <Toast
          message={toastMessage}
          isError={toastMessage.includes("Failed")}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}
