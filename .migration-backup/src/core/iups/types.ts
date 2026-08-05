export interface IdealyUniversalProjectSchema {
  project: {
    name: string;
    description?: string;
    stack?: 'react-vite-typescript' | 'expo-react-native' | string;
    files: Record<string, string>; // Maps file paths (e.g. 'src/App.tsx') to file content
  };
}
