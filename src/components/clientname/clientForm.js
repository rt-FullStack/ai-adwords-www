import React, { useState } from 'react';

export default function ClientForm() {
  const [clientName, setClientName] = useState('');
  const [adGroupName, setAdGroupName] = useState('');
  const [categoryName, setCategoryName] = useState('');

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    // Your collection creation logic here
    console.log('Creating collection for:', clientName, adGroupName, categoryName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If no ad group is specified, use "Generic"
    const targetAdGroup = adGroupName || "Generic";
    
    if (clientName && categoryName) {
      handleCreateCollection(e);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Client Name</label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Enter client name"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Ad Group Name (optional)</label>
        <input
          type="text"
          value={adGroupName}
          onChange={(e) => setAdGroupName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Leave empty for Generic ad group"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Category Name</label>
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Enter category name"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Submit
      </button>
    </form>
  );
}