'use server';

/**
 * @fileOverview Retrieves the Firebase API key.
 *
 * - getFirebaseApiKey - A function that returns the Firebase API key.
 * - GetFirebaseApiKeyOutput - The return type for the getFirebaseApiKey function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GetFirebaseApiKeyOutputSchema = z.object({
  firebaseApiKey: z.string().describe('The Firebase API key.'),
});
export type GetFirebaseApiKeyOutput = z.infer<typeof GetFirebaseApiKeyOutputSchema>;

export const getFirebaseApiKey = ai.defineTool(
  {
    name: 'getFirebaseApiKey',
    description: 'Returns the Firebase API key.',
    inputSchema: z.object({}),
    outputSchema: GetFirebaseApiKeyOutputSchema,
  },
  async () => {
    return {firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''};
  }
);
