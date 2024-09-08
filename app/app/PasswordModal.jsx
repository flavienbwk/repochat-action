import { useState } from 'react';
import { validatePassword } from './Api';

export default function PasswordModal({ onValidate, isLoading }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await validatePassword(password);
      if (response.access_token) {
        onValidate(response.access_token);
      } else {
        setError('Invalid password');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl">
        {isLoading ? (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold mb-4">Enter Password</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 mb-4 border rounded"
              placeholder="Password"
            />
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <button type="submit" className="w-full bg-indigo-500 text-white p-2 rounded hover:bg-indigo-600">
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
