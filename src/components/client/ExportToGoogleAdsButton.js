import React, { useState } from "react";
import { FaFileExport } from "react-icons/fa";
import Toast from "@/components/Toast";
import { db } from "@/firebase/firebase";
import { collection, doc, getDocs, updateDoc, getDoc } from "firebase/firestore";

export default function ExportToGoogleAdsButton({ currentUser, onUpdateComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);

  const showToastMessage = (message, isError = false) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Fetch clients from Firestore
  const fetchAvailableClients = async () => {
    setIsLoading(true);
    try {
      const clientsRef = collection(db, "clients", currentUser.uid, "client");
      const clientsSnapshot = await getDocs(clientsRef);

      const clients = [];
      for (const doc of clientsSnapshot.docs) {
        clients.push({
          id: doc.id,
          name: doc.id,
          ...doc.data(),
        });
      }

      setAvailableClients(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      showToastMessage("Failed to fetch clients", true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentUser || selectedClients.length === 0) {
      showToastMessage("Please select at least one client to export", true);
      return;
    }

    setIsLoading(true);
    try {
      for (const client of selectedClients) {
        const clientData = await fetchClientData(client.id);
        console.log("Fetched client data:", clientData);

        // Get the client's Google Ads ID from Firestore
        const clientRef = doc(db, "clients", currentUser.uid, "client", client.id);
        const clientDoc = await getDoc(clientRef);
        const googleAdsCustomerId = clientDoc.data()?.googleAdsId;

        if (!googleAdsCustomerId) {
          console.error(`No Google Ads ID found for client ${client.id}`);
          showToastMessage(`Failed to export ${client.id}: No Google Ads ID found`, true);
          continue;
        }

        const formattedAds = [];

        // Process each campaign
        for (const campaign of clientData.campaigns || []) {
          for (const adGroup of campaign.adTypes || []) {
            for (const ad of adGroup.categories || []) {
              console.log("Processing ad:", ad);
              // Add detailed debug logging for googleAdsId
              console.log(`Ad ${ad.name || ad.categoryName} googleAdsId:`, {
                hasId: !!ad.googleAdsId,
                idValue: ad.googleAdsId || "MISSING",
                idType: ad.googleAdsId ? typeof ad.googleAdsId : "undefined",
              });

              // Format ad data regardless of whether it's new or existing
              formattedAds.push({
                campaignName: campaign.name,
                adGroupName: adGroup.name,
                categoryName: ad.name || ad.categoryName,
                adId: ad.googleAdsId, // This might be undefined for new ads
                isNew: !ad.googleAdsId, // Flag to indicate if this is a new ad
                finalUrls: ad.finalUrlValues.map((url) => url.text).filter(Boolean),
                finalMobileUrls: [],
                headlines: ad.headlineValues
                  .map((headline) => ({
                    text: headline.text,
                    pinnedField: headline.pin ? `HEADLINE_${headline.pin}` : null,
                  }))
                  .filter((h) => h.text),
                descriptions: ad.descriptionValues
                  .map((desc) => ({
                    text: desc.text,
                    pinnedField: desc.pin ? `DESCRIPTION_${desc.pin}` : null,
                  }))
                  .filter((d) => d.text),
                paths: {
                  path1: ad.pathValues[0]?.text || "",
                  path2: ad.pathValues[1]?.text || "",
                },
                status: ad.adStatus || "ENABLED",
              });
            }
          }
        }

        if (formattedAds.length === 0) {
          console.log("No ads to process");
          continue;
        }

        // Log the formatted ads before sending
        console.log("Before sending, formatted ads:", formattedAds);

        // Check for duplicate ads (same name or very similar content)
        const uniqueAdNames = new Set();
        const uniqueAds = [];

        for (const ad of formattedAds) {
          // Fix any missing adId fields if googleAdsId exists
          if (!ad.adId && ad.googleAdsId) {
            console.log(`Fixing missing adId for ad ${ad.categoryName}. Setting adId to googleAdsId value: ${ad.googleAdsId}`);
            ad.adId = ad.googleAdsId;
          }

          // Skip duplicate ad names to avoid conflicts
          if (uniqueAdNames.has(ad.categoryName)) {
            console.log(`⚠️ Skipping duplicate ad name: ${ad.categoryName}`);
            continue;
          }

          uniqueAdNames.add(ad.categoryName);
          uniqueAds.push(ad);

          // Log whether this ad will be treated as new or update
          console.log(`Ad ${ad.categoryName} will be treated as: ${ad.adId ? "UPDATE" : "NEW"}`);
        }

        // Process ads in batches to avoid hitting the 3 ad limit
        // First process updates (they remove old ads first)
        const updatesAds = uniqueAds.filter((ad) => ad.adId);
        const newAds = uniqueAds.filter((ad) => !ad.adId);

        console.log(`Processing ${updatesAds.length} updates and ${newAds.length} new ads`);

        // Process ads one by one for better control
        for (let i = 0; i < uniqueAds.length; i++) {
          // Process in batches of 1 to ensure each update completes before starting the next
          const adToProcess = [uniqueAds[i]];

          console.log(`Processing ad ${i + 1}/${uniqueAds.length}: ${adToProcess[0].categoryName}`);
          console.log(`AdId: ${adToProcess[0].adId || "NEW"}`);

          const requestBody = {
            customerId: googleAdsCustomerId,
            ads: adToProcess,
          };

          console.log(`Sending request for ad "${adToProcess[0].categoryName}":`);

          try {
            const response = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/create-or-update-ads", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            console.log(`API Response for ad "${adToProcess[0].categoryName}":`, JSON.stringify(data, null, 2));

            if (!response.ok) {
              throw new Error(data.error || `Failed to process ad ${adToProcess[0].categoryName}`);
            }

            if (data.updatedAds && Array.isArray(data.updatedAds)) {
              console.log(`Updating local database for ad "${adToProcess[0].categoryName}"`);
              await updateLocalAdsWithGoogleIds(client.id, data.updatedAds);
            }

            // Reduced delay between requests to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error processing ad "${adToProcess[0].categoryName}":`, error);
            showToastMessage(`Error with ad "${adToProcess[0].categoryName}": ${error.message}`, true);
          }
        }

        console.log(`Finished processing all ads for client ${client.id}`);
      }

      showToastMessage(`Successfully exported ${selectedClients.length} clients to Google Ads!`);
      if (onUpdateComplete) onUpdateComplete();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error exporting to Google Ads:", error);
      showToastMessage(error.message || "Failed to export to Google Ads", true);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to fetch all data for a client
  const fetchClientData = async (clientId) => {
    const clientRef = doc(db, "clients", currentUser.uid, "client", clientId);
    const adGroupsRef = collection(clientRef, "adGroups");

    const adGroupsSnapshot = await getDocs(adGroupsRef);
    const campaigns = [];

    for (const adGroupDoc of adGroupsSnapshot.docs) {
      const adGroup = {
        name: adGroupDoc.id,
        ...adGroupDoc.data(),
        adTypes: [],
      };

      const adTypesRef = collection(adGroupDoc.ref, "adTypes");
      const adTypesSnapshot = await getDocs(adTypesRef);

      for (const adTypeDoc of adTypesSnapshot.docs) {
        const adType = {
          name: adTypeDoc.id,
          ...adTypeDoc.data(),
          categories: [],
        };

        const categoriesRef = collection(adTypeDoc.ref, "categories");
        const categoriesSnapshot = await getDocs(categoriesRef);

        adType.categories = categoriesSnapshot.docs.map((doc) => ({
          name: doc.id,
          ...doc.data(),
        }));

        adGroup.adTypes.push(adType);
      }

      campaigns.push(adGroup);
    }

    return { campaigns };
  };

  // Helper function to update local database with Google Ads IDs
  const updateLocalAdsWithGoogleIds = async (clientId, updatedAds) => {
    console.log("Updating local ads with Google Ads IDs:", updatedAds);

    let successCount = 0;
    let errorCount = 0;

    for (const ad of updatedAds) {
      console.log("Processing ad:", ad);

      // Extract Google Ads ID from adId if needed
      let googleAdsId = ad.googleAdsId;
      if (!googleAdsId && ad.adId && typeof ad.adId === "string") {
        if (ad.adId.includes("~")) {
          googleAdsId = ad.adId.split("~").pop();
          console.log(`Extracted googleAdsId ${googleAdsId} from adId ${ad.adId}`);
        } else {
          googleAdsId = ad.adId;
        }
      }

      if (!googleAdsId) {
        console.error("Missing googleAdsId for ad:", ad);
        errorCount++;
        continue;
      }

      const campaignName = ad.campaignName;
      const adGroupName = ad.adGroupName;
      const categoryName = ad.categoryName;

      if (!campaignName || !adGroupName) {
        console.error("Missing campaignName or adGroupName:", ad);
        errorCount++;
        continue;
      }

      try {
        if (categoryName) {
          // If we have a category name, use direct path
          console.log(
            `Updating Firebase with path: clients/${currentUser.uid}/client/${clientId}/adGroups/${campaignName}/adTypes/${adGroupName}/categories/${categoryName}`
          );

          const adRef = doc(
            db,
            "clients",
            currentUser.uid,
            "client",
            clientId,
            "adGroups",
            campaignName,
            "adTypes",
            adGroupName,
            "categories",
            categoryName
          );

          // Check if document exists
          const docSnap = await getDoc(adRef);
          if (docSnap.exists()) {
            await updateDoc(adRef, {
              googleAdsId: googleAdsId,
            });
            console.log(`✅ Updated ad ${categoryName} with Google Ads ID: ${googleAdsId}`);
            successCount++;

            // Notify parent component to update UI
            if (onUpdateComplete) {
              onUpdateComplete({
                clientName: clientId,
                adGroupName: campaignName,
                adTypeName: adGroupName,
                categoryName: categoryName,
                googleAdsId: googleAdsId,
              });
            }
          } else {
            console.error(`Document does not exist at path for category ${categoryName}`);
            errorCount++;
          }
        } else {
          // If we don't have a category name, search for the most recent ad
          console.log("Category name missing, searching for most recent ad...");

          const categoriesRef = collection(
            db,
            "clients",
            currentUser.uid,
            "client",
            clientId,
            "adGroups",
            campaignName,
            "adTypes",
            adGroupName,
            "categories"
          );

          const categoriesSnapshot = await getDocs(categoriesRef);

          if (categoriesSnapshot.empty) {
            console.error("No categories found in this ad group");
            continue;
          }

          // Find the most recent ad
          let newestDoc = null;
          let newestTimestamp = 0;

          categoriesSnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp?.toMillis() || 0;

            if (timestamp > newestTimestamp) {
              newestTimestamp = timestamp;
              newestDoc = doc;
            }
          });

          if (newestDoc) {
            await updateDoc(newestDoc.ref, {
              googleAdsId: googleAdsId,
            });

            console.log(`✅ Updated ad ${newestDoc.id} with Google Ads ID: ${googleAdsId}`);
            successCount++;

            // Notify parent component to update UI
            if (onUpdateComplete) {
              onUpdateComplete({
                clientName: clientId,
                adGroupName: campaignName,
                adTypeName: adGroupName,
                categoryName: newestDoc.id,
                googleAdsId: googleAdsId,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error updating ad:`, error);
        errorCount++;
      }
    }

    console.log(`Firebase updates completed: ${successCount} successful, ${errorCount} errors`);
  };

  // Add function to check if client exists in Google Ads
  const checkExistingClient = async (clientName) => {
    try {
      const response = await fetch("https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/fetch-clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch Google Ads clients");
      }

      // Find matching client by name
      return data.clients.find((c) => c.name === clientName);
    } catch (error) {
      console.error("Error checking existing client:", error);
      return null;
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsModalOpen(true);
          fetchAvailableClients();
        }}
        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md"
        title="Export to Google Ads"
      // disabled
      // style={{
      //   opacity: 0.5,
      //   cursor: "not-allowed",        }}
      >
        <FaFileExport size={18} />
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          style={{
            position: "fixed",
            top: -80,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            width: "100vw",
          }}>
          <div className="bg-white rounded-lg w-1/2 max-w-4xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-800">Export to Google Ads</h2>
              <p className="text-gray-600 mt-1">Select the clients you want to export</p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-2">
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
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <label
                        htmlFor={client.id}
                        className="ml-3 block text-sm font-medium text-gray-700">
                        {client.name}
                        {client.googleAdsId && (
                          <span className="ml-2 text-sm text-gray-500">(Already exists in Google Ads - will update)</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isLoading}>
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isLoading || selectedClients.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>Export Selected ({selectedClients.length})</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && <Toast message={toastMessage} />}
    </>
  );
}
