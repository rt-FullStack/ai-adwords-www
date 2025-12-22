"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/components/authContext";
import Button from "@/components/buttons";
import Toast from "@/components/Toast";
import { FaTrash } from "react-icons/fa";
import Select from 'react-select/async';
import debounce from 'lodash/debounce';

// Add this new component at the top of the file, before the main component
function LocationSearchModal({ isOpen, onClose, onSelect, selectedLocations }) {
    const [searchInput, setSearchInput] = useState('');
    const [locationOptions, setLocationOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadLocationOptions = async (inputValue) => {
        try {
            setIsLoading(true);
            const response = await fetch(`https://ai-adwords-263809614075.europe-north1.run.app/api/locations?query=${inputValue}`);
            if (!response.ok) {
                console.error('Error response from server:', response.status);
                return [];
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                console.error('Invalid response format:', data);
                return [];
            }

            return data.map(location => ({
                value: location.id,
                label: location.name,
                type: location.type,
                country_code: location.country_code
            }));
        } catch (error) {
            console.error('Error loading locations:', error);
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        const options = await loadLocationOptions(searchInput);
        setLocationOptions(options);
    };

    const handleSelect = (option) => {
        if (option && !selectedLocations.some(loc => loc.value === option.value)) {
            onSelect(option);
        }
        setSearchInput('');
        setLocationOptions([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Search Locations</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ×
                    </button>
                </div>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search for a location..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {locationOptions.length > 0 ? (
                        <div className="space-y-2">
                            {locationOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => handleSelect(option)}
                                    className="p-3 hover:bg-gray-100 cursor-pointer rounded-md"
                                >
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-sm text-gray-500">
                                        {option.type} • {option.country_code}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-4">
                            {isLoading ? 'Loading locations...' : 'No locations found'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CampaignSettings({ params }) {
    const router = useRouter();
    const { currentUser } = useAuth();
    const { clientId, campaignId } = params;
    const isEditMode = campaignId !== 'new';
    // Decode clientId to handle spaces and special characters
    const decodedClientId = decodeURIComponent(clientId);
    const decodedCampaignId = decodeURIComponent(campaignId);
    const [showToast, setShowToast] = useState(false);
    const [isLanguagesOpen, setIsLanguagesOpen] = useState(false);
    const [isAdGroupsOpen, setIsAdGroupsOpen] = useState(true);
    const [campaignName, setCampaignName] = useState("");
    const [campaignStatus, setCampaignStatus] = useState("active");
    const [adGroups, setAdGroups] = useState([{
        name: "",
        maxCpc: "0.01",
        status: "active"
    }]);
    const [formData, setFormData] = useState({
        campaignDailyBudget: "",
        campaignType: "Search",
        networks: ["Google search", "Search Partners"],
        languages: ["en"],
        maxCpc: "",
        bidStrategyType: "Manual CPC",
        bidStrategySettings: {},
        budgetType: "Daily",
        labels: "",
        broadMatchKeywords: "Off",
        adRotation: "Optimize for clicks",
        targetingMethod: "Location of presence or Area of interest",
        startDate: null,
        endDate: null,
        location: "",
        locationId: "",
        targetCpa: "",
        targetRoas: "",
        targetImpressionShare: "",
        adLocation: "Anywhere on results page"
    });
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    // Add useEffect to load campaign data when in edit mode
    useEffect(() => {
        const loadCampaignData = async () => {
            if (!currentUser || !isEditMode) return;

            try {
                // Load campaign data
                const campaignRef = doc(db, "clients", currentUser.uid, "client", decodedClientId, "adGroups", decodedCampaignId);
                const campaignDoc = await getDoc(campaignRef);

                if (campaignDoc.exists()) {
                    const campaignData = campaignDoc.data();
                    setCampaignName(campaignData.campaignName || campaignData.name);
                    setCampaignStatus(campaignData.campaignStatus?.toLowerCase() || "active");
                    setFormData(prev => ({
                        ...prev,
                        campaignDailyBudget: campaignData.campaignDailyBudget || "",
                        campaignType: campaignData.campaignType || "Search",
                        networks: campaignData.networks || ["Google search", "Search Partners"],
                        languages: campaignData.languages || ["en"],
                        maxCpc: campaignData.maxCpc || "",
                        bidStrategyType: campaignData.bidStrategyType || "Manual CPC",
                        budgetType: campaignData.budgetType || "Daily",
                        labels: campaignData.labels || "",
                        broadMatchKeywords: campaignData.broadMatchKeywords || "Off",
                        adRotation: campaignData.adRotation || "Optimize for clicks",
                        targetingMethod: campaignData.targetingMethod || "Location of presence or Area of interest",
                        startDate: campaignData.startDate || null,
                        endDate: campaignData.endDate || null,
                        location: campaignData.location || "",
                        locationId: campaignData.locationId || "",
                        targetCpa: campaignData.targetCpa || "",
                        targetRoas: campaignData.targetRoas || "",
                        targetImpressionShare: campaignData.targetImpressionShare || "",
                        adLocation: campaignData.adLocation || "Anywhere on results page"
                    }));

                    // Load ad groups
                    const adTypesRef = collection(campaignRef, "adTypes");
                    const adTypesSnapshot = await getDocs(adTypesRef);
                    console.log("Loading ad groups from Firebase:", adTypesSnapshot.docs.map(doc => doc.data()));
                    const loadedAdGroups = adTypesSnapshot.docs.map(doc => {
                        const data = doc.data();
                        const status = data.adGroupStatus || "active";
                        console.log("Processing ad group:", data.name, "Status from Firebase:", data.adGroupStatus);
                        return {
                            name: data.name || doc.id,
                            maxCpc: data.maxCpc || "0.01",
                            status: status.toLowerCase() // Convert to lowercase for consistency
                        };
                    });
                    console.log("Processed ad groups:", loadedAdGroups);
                    setAdGroups(loadedAdGroups.length > 0 ? loadedAdGroups : [{
                        name: "",
                        maxCpc: "0.01",
                        status: "active"
                    }]);

                    // Handle locations
                    if (campaignData.location && campaignData.locationId) {
                        setSelectedLocations([{
                            value: campaignData.locationId,
                            label: campaignData.location,
                            type: 'City', // You might want to get this from the API
                            country_code: 'SE' // You might want to get this from the API
                        }]);
                    }
                }
            } catch (error) {
                console.error("Error loading campaign data:", error);
                alert("Error loading campaign data. Please try again.");
            }
        };

        loadCampaignData();
    }, [currentUser, isEditMode, decodedClientId, decodedCampaignId]);

    const handleAddAdGroup = () => {
        setAdGroups([...adGroups, { name: "", maxCpc: "0.01", status: "active" }]);
    };

    const handleRemoveAdGroup = (index) => {
        const newAdGroups = adGroups.filter((_, i) => i !== index);
        setAdGroups(newAdGroups);
    };

    const handleAdGroupChange = (index, field, value) => {
        const newAdGroups = [...adGroups];
        newAdGroups[index] = { ...newAdGroups[index], [field]: value };
        setAdGroups(newAdGroups);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentUser || !decodedClientId || !campaignName) {
            alert("Missing required information");
            return;
        }

        // Validate campaign name
        if (!campaignName.trim()) {
            alert("Please enter a campaign name");
            return;
        }

        // Validate ad groups
        if (adGroups.length === 0) {
            alert("Please add at least one ad group");
            return;
        }

        // Check for empty ad group names
        const hasEmptyAdGroupNames = adGroups.some(group => !group.name.trim());
        if (hasEmptyAdGroupNames) {
            alert("Please provide names for all ad groups");
            return;
        }

        try {
            // If in edit mode and the name has changed, we need to migrate all data
            if (isEditMode && decodedCampaignId !== campaignName) {
                // First, get all existing ad groups and their categories (ads)
                const oldAdGroupRef = doc(db, "clients", currentUser.uid, "client", decodedClientId, "adGroups", decodedCampaignId);
                const oldAdTypesRef = collection(oldAdGroupRef, "adTypes");
                const oldAdTypesSnapshot = await getDocs(oldAdTypesRef);

                // Store all the data we need to migrate
                const dataToMigrate = [];

                // For each ad group, get its categories (ads)
                for (const adTypeDoc of oldAdTypesSnapshot.docs) {
                    const categoriesRef = collection(oldAdGroupRef, "adTypes", adTypeDoc.id, "categories");
                    const categoriesSnapshot = await getDocs(categoriesRef);

                    dataToMigrate.push({
                        adGroup: {
                            id: adTypeDoc.id,
                            data: adTypeDoc.data()
                        },
                        categories: categoriesSnapshot.docs.map(doc => ({
                            id: doc.id,
                            data: doc.data()
                        }))
                    });
                }

                // Create new campaign with updated name
                const newAdGroupRef = doc(db, "clients", currentUser.uid, "client", decodedClientId, "adGroups", campaignName);

                // Prepare campaign data
                const campaignData = {
                    name: campaignName,
                    id: campaignName,
                    campaignName: campaignName,
                    campaignStatus: campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1),
                    // Campaign settings
                    campaignDailyBudget: formData.campaignDailyBudget || "",
                    campaignType: formData.campaignType || "Search",
                    networks: formData.networks || [],
                    languages: formData.languages || [],
                    bidStrategyType: formData.bidStrategyType || "",
                    maxCpc: formData.maxCpc || "",
                    adRotation: formData.adRotation || "",
                    targetCpa: formData.targetCpa || "",
                    targetRoas: formData.targetRoas || "",
                    targetImpressionShare: formData.targetImpressionShare || "",
                    broadMatchKeywords: formData.broadMatchKeywords || "Off",
                    labels: formData.labels || "",
                    targetingMethod: formData.targetingMethod || "",
                    startDate: formData.startDate || null,
                    endDate: formData.endDate || null,
                    adLocation: formData.adLocation || "Anywhere on results page",
                    timestamp: serverTimestamp(),
                };

                // Only add location data if it exists
                if (selectedLocations && selectedLocations.length > 0) {
                    const locationData = selectedLocations[0];
                    campaignData.location = locationData.label;
                    campaignData.locationId = locationData.value;
                }

                await setDoc(newAdGroupRef, campaignData);

                // Migrate all ad groups and their categories to the new campaign
                for (const item of dataToMigrate) {
                    const newAdTypeRef = doc(newAdGroupRef, "adTypes", item.adGroup.id);
                    await setDoc(newAdTypeRef, {
                        ...item.adGroup.data,
                        timestamp: serverTimestamp()
                    });

                    // Migrate categories (ads) for this ad group
                    for (const category of item.categories) {
                        const newCategoryRef = doc(newAdTypeRef, "categories", category.id);
                        await setDoc(newCategoryRef, {
                            ...category.data,
                            timestamp: serverTimestamp()
                        });
                    }
                }

                // Delete the old campaign document after successful migration
                await deleteDoc(oldAdGroupRef);
            } else {
                // Normal save without migration
                const adGroupRef = doc(db, "clients", currentUser.uid, "client", decodedClientId, "adGroups", campaignName);

                // Prepare campaign data
                const campaignData = {
                    name: campaignName,
                    id: campaignName,
                    campaignName: campaignName,
                    campaignStatus: campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1),
                    // Campaign settings
                    campaignDailyBudget: formData.campaignDailyBudget || "",
                    campaignType: formData.campaignType || "Search",
                    networks: formData.networks || [],
                    languages: formData.languages || [],
                    bidStrategyType: formData.bidStrategyType || "",
                    maxCpc: formData.maxCpc || "",
                    adRotation: formData.adRotation || "",
                    targetCpa: formData.targetCpa || "",
                    targetRoas: formData.targetRoas || "",
                    targetImpressionShare: formData.targetImpressionShare || "",
                    broadMatchKeywords: formData.broadMatchKeywords || "Off",
                    labels: formData.labels || "",
                    targetingMethod: formData.targetingMethod || "",
                    startDate: formData.startDate || null,
                    endDate: formData.endDate || null,
                    adLocation: formData.adLocation || "Anywhere on results page",
                    timestamp: serverTimestamp(),
                };

                // Only add location data if it exists
                if (selectedLocations && selectedLocations.length > 0) {
                    const locationData = selectedLocations[0];
                    campaignData.location = locationData.label;
                    campaignData.locationId = locationData.value;
                }

                await setDoc(adGroupRef, campaignData);

                // Create ad groups under adTypes
                for (const adGroup of adGroups) {
                    const adTypeRef = doc(db, "clients", currentUser.uid, "client", decodedClientId, "adGroups", campaignName, "adTypes", adGroup.name);
                    await setDoc(adTypeRef, {
                        name: adGroup.name,
                        id: adGroup.name,
                        adGroupName: adGroup.name,
                        adGroupStatus: adGroup.status.charAt(0).toUpperCase() + adGroup.status.slice(1),
                        maxCpc: formData.bidStrategyType === "Manual CPC" ? adGroup.maxCpc : null,
                        targetCpa: formData.bidStrategyType === "Maximize conversions" && formData.targetCpa ? (adGroup.targetCpa || formData.targetCpa) : null,
                        targetRoas: formData.bidStrategyType === "Maximize conversion value" && formData.targetRoas ? (adGroup.targetRoas || formData.targetRoas) : null,
                        timestamp: serverTimestamp(),
                    });
                }
            }

            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                router.back();
            }, 2000);
        } catch (error) {
            console.error("Error saving campaign:", error);
            alert("Error saving campaign. Please try again.");
        }
    };

    // Update the location selection handler
    const handleLocationSelect = (selectedOption) => {
        if (selectedOption && !selectedLocations.some(loc => loc.value === selectedOption.value)) {
            setSelectedLocations([...selectedLocations, selectedOption]);
        }
        setIsLocationModalOpen(false);
    };

    const handleAddLocation = (location) => {
        if (!selectedLocations.some(loc => loc.value === location.value)) {
            setSelectedLocations([...selectedLocations, location]);
        }
        setIsLocationModalOpen(false);
    };

    const handleRemoveLocation = (locationToRemove) => {
        setSelectedLocations(selectedLocations.filter(loc => loc.value !== locationToRemove.value));
    };

    // Update the location section in the JSX
    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto py-6 px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold">{isEditMode ? 'Edit Campaign' : 'Create New Campaign'}</h1>
                    <button
                        onClick={() => router.back()}
                        className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded">
                        Go Back
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Campaign Name and Status */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                            <input
                                type="text"
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter campaign name"
                                required
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={campaignStatus}
                                onChange={(e) => setCampaignStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                            </select>
                        </div>
                    </div>

                    {/* Bid Strategy Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bid Strategy Type</label>
                        <select
                            value={formData.bidStrategyType}
                            onChange={(e) => setFormData(prev => ({ ...prev, bidStrategyType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option value="Manual CPC">Manual CPC</option>
                            <option value="Maximize clicks">Maximize clicks</option>
                            <option value="Maximize conversions">Maximize conversions</option>
                            <option value="Maximize conversion value">Maximize conversion value</option>
                            <option value="Target impression share">Target impression share</option>
                        </select>
                    </div>

                    {/* Bid Strategy Settings */}
                    {formData.bidStrategyType === "Maximize clicks" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum CPC bid limit</label>
                            <input
                                type="number"
                                value={formData.maxCpc}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxCpc: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter max CPC bid limit"
                                step="0.01"
                            />
                        </div>
                    )}

                    {formData.bidStrategyType === "Maximize conversions" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target CPA</label>
                            <input
                                type="number"
                                value={formData.targetCpa}
                                onChange={(e) => setFormData(prev => ({ ...prev, targetCpa: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter target CPA"
                                step="0.01"
                            />
                        </div>
                    )}

                    {formData.bidStrategyType === "Maximize conversion value" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target ROAS (%)</label>
                            <input
                                type="number"
                                value={formData.targetRoas}
                                onChange={(e) => setFormData(prev => ({ ...prev, targetRoas: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter target ROAS"
                                step="1"
                            />
                        </div>
                    )}

                    {formData.bidStrategyType === "Target impression share" && (
                        <div className="grid grid-cols-2 gap-x-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target impression share (%)</label>
                                <input
                                    type="number"
                                    value={formData.targetImpressionShare}
                                    onChange={(e) => setFormData(prev => ({ ...prev, targetImpressionShare: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter target impression share"
                                    step="1"
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum CPC bid limit</label>
                                <input
                                    type="number"
                                    value={formData.maxCpc}
                                    onChange={(e) => setFormData(prev => ({ ...prev, maxCpc: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter max CPC bid limit"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    )}

                    {/* Ad Groups Section */}
                    <div className="space-y-4 border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAdGroupsOpen(!isAdGroupsOpen)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    {isAdGroupsOpen ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                </button>
                                <h2 className="text-lg font-medium">Ad Groups ({adGroups.length})</h2>
                                {!isAdGroupsOpen && (
                                    <span className="text-sm text-gray-500">
                                        {adGroups.filter(g => g.status === "active").length} active,
                                        {adGroups.filter(g => g.status === "paused").length} paused
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddAdGroup}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                Add Ad Group
                            </button>
                        </div>

                        {isAdGroupsOpen && (
                            <div className="space-y-4 mt-4">
                                {adGroups.map((adGroup, index) => (
                                    <div key={index} className="p-4 border rounded-lg">
                                        <div className="flex justify-between items-center gap-4">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={adGroup.name}
                                                    onChange={(e) => handleAdGroupChange(index, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Enter ad group name"
                                                    required
                                                />
                                            </div>
                                            <div className="w-32">
                                                <select
                                                    value={adGroup.status}
                                                    onChange={(e) => handleAdGroupChange(index, 'status', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                                    <option value="active">Active</option>
                                                    <option value="paused">Paused</option>
                                                </select>
                                            </div>
                                            {formData.bidStrategyType === "Manual CPC" && (
                                                <div className="w-32">
                                                    <input
                                                        type="number"
                                                        value={adGroup.maxCpc}
                                                        onChange={(e) => handleAdGroupChange(index, 'maxCpc', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Max CPC"
                                                        step="0.01"
                                                        min="0.01"
                                                        required
                                                    />
                                                </div>
                                            )}
                                            {formData.bidStrategyType === "Maximize conversions" && formData.targetCpa && (
                                                <div className="w-32">
                                                    <input
                                                        type="number"
                                                        value={adGroup.targetCpa || ''}
                                                        onChange={(e) => handleAdGroupChange(index, 'targetCpa', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder={`Default ${formData.targetCpa}`}
                                                        step="0.01"
                                                    />
                                                </div>
                                            )}
                                            {formData.bidStrategyType === "Maximize conversion value" && formData.targetRoas && (
                                                <div className="w-32">
                                                    <input
                                                        type="number"
                                                        value={adGroup.targetRoas || ''}
                                                        onChange={(e) => handleAdGroupChange(index, 'targetRoas', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder={`Default ${formData.targetRoas}`}
                                                        step="1"
                                                    />
                                                </div>
                                            )}
                                            {adGroups.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAdGroup(index)}
                                                    className="text-red-500 hover:text-red-700">
                                                    <FaTrash size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        {/* Campaign Daily Budget */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Daily Budget</label>
                            <input
                                type="number"
                                value={formData.campaignDailyBudget}
                                onChange={(e) => setFormData(prev => ({ ...prev, campaignDailyBudget: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter daily budget"
                                step="0.01"
                            />
                        </div>

                        {/* Campaign Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
                            <select
                                value={formData.campaignType}
                                onChange={(e) => setFormData(prev => ({ ...prev, campaignType: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                disabled>
                                <option value="Search">Search</option>
                            </select>
                        </div>

                        {/* Networks */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Networks</label>
                            <div className="space-y-2">
                                {["Google search", "Search Partners", "Display Network"].map((network) => (
                                    <label key={network} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.networks?.includes(network)}
                                            onChange={(e) => {
                                                const newNetworks = e.target.checked
                                                    ? [...(formData.networks || []), network]
                                                    : (formData.networks || []).filter(n => n !== network);
                                                setFormData(prev => ({ ...prev, networks: newNetworks }));
                                            }}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">{network}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Languages */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
                            <button
                                type="button"
                                onClick={() => setIsLanguagesOpen(!isLanguagesOpen)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex justify-between items-center"
                            >
                                <span className="text-sm text-gray-700">
                                    {formData.languages?.length || 0} language{formData.languages?.length !== 1 ? 's' : ''} selected
                                </span>
                                <svg className={`h-5 w-5 text-gray-400 transform ${isLanguagesOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {isLanguagesOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    <div className="p-2 space-y-2">
                                        {[
                                            { code: "sv", name: "Swedish" },
                                            { code: "no", name: "Norwegian" },
                                            { code: "da", name: "Danish" },
                                            { code: "fi", name: "Finnish" },
                                            { code: "en", name: "English" },
                                            { code: "de", name: "German" },
                                            { code: "fr", name: "French" },
                                            { code: "es", name: "Spanish" },
                                            { code: "it", name: "Italian" },
                                            { code: "nl", name: "Dutch" },
                                            { code: "pt", name: "Portuguese" }
                                        ].map(lang => (
                                            <label key={lang.code} className="flex items-center hover:bg-gray-50 p-2 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.languages?.includes(lang.code)}
                                                    onChange={(e) => {
                                                        const newLanguages = e.target.checked
                                                            ? [...(formData.languages || []), lang.code]
                                                            : (formData.languages || []).filter(l => l !== lang.code);
                                                        setFormData(prev => ({ ...prev, languages: newLanguages }));
                                                    }}
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">{lang.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Labels */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
                            <input
                                type="text"
                                value={formData.labels}
                                onChange={(e) => setFormData(prev => ({ ...prev, labels: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter labels"
                            />
                        </div>

                        {/* Broad Match Keywords */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Broad Match Keywords</label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.broadMatchKeywords === "On"}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        broadMatchKeywords: e.target.checked ? "On" : "Off"
                                    }))}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Enable Broad Match Keywords</span>
                            </label>
                        </div>

                        {/* Ad Rotation */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Rotation</label>
                            <select
                                value={formData.adRotation}
                                onChange={(e) => setFormData(prev => ({ ...prev, adRotation: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                <option value="Optimize for clicks">Optimize for clicks</option>
                                <option value="Rotate indefinitely">Rotate indefinitely</option>
                            </select>
                        </div>

                        {/* Targeting Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Targeting Method</label>
                            <select
                                value={formData.targetingMethod}
                                onChange={(e) => setFormData(prev => ({ ...prev, targetingMethod: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                <option value="Location of presence or Area of interest">Location of presence or Area of interest</option>
                                <option value="Location of presence">Location of presence</option>
                                <option value="Area of interest">Area of interest</option>
                            </select>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={formData.startDate || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    startDate: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={formData.endDate || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    endDate: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Ad Location */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Location</label>
                            <select
                                value={formData.adLocation || 'Anywhere on results page'}
                                onChange={(e) => setFormData(prev => ({ ...prev, adLocation: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                                <option value="Anywhere on results page">Anywhere on results page</option>
                                <option value="Top of results page">Top of results page</option>
                                <option value="Absolute top of results page">Absolute top of results page</option>
                            </select>
                        </div>

                        {/* Location */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Locations
                            </label>
                            <div className="flex gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLocationModalOpen(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    Add Location
                                </button>
                            </div>

                            {selectedLocations && selectedLocations.length > 0 && (
                                <div className="mt-2">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLocations.map((location) => (
                                            <div
                                                key={location.value}
                                                className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
                                            >
                                                <span>{location.label}</span>
                                                <button
                                                    onClick={() => handleRemoveLocation(location)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            Save Campaign Settings
                        </button>
                    </div>
                </form>
            </div>

            {showToast && <Toast message="Settings saved successfully!" />}

            {/* Add the modal component */}
            <LocationSearchModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelect={handleLocationSelect}
                selectedLocations={selectedLocations}
            />
        </div>
    );
} 