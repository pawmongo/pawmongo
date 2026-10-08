'use client';

import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface ExportCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  database: string;
  collection: string;
}

export function ExportCodeModal({
  isOpen,
  onClose,
  query,
  database,
  collection,
}: ExportCodeModalProps) {
  const [activeLang, setActiveLang] = useState<'python' | 'node' | 'java' | 'csharp' | 'mongosh'>('python');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filterObj = query.trim() || '{}';

  const snippets: Record<string, string> = {
    python: `from pymongo import MongoClient

# Requires the PyMongo package.
# https://api.mongodb.com/python/current

client = MongoClient('mongodb+srv://<db_username>:<db_password>@overview.example.mongodb.net/?retryWrites=true&w=majority')
filter = ${filterObj}

result = client['${database}']['${collection}'].find(filter=filter)
for doc in result:
    print(doc)`,

    node: `const { MongoClient } = require('mongodb');

/*
 * Requires the MongoDB Node.js Driver
 * https://mongodb.github.io/node-mongodb-native
 */

const filter = ${filterObj};

const client = await MongoClient.connect(
  'mongodb+srv://<db_username>:<db_password>@overview.example.mongodb.net/?retryWrites=true&w=majority'
);
const coll = client.db('${database}').collection('${collection}');
const cursor = coll.find(filter);
const result = await cursor.toArray();
await client.close();`,

    java: `import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;

public class App {
    public static void main(String[] args) {
        String uri = "mongodb+srv://<db_username>:<db_password>@overview.example.mongodb.net/?retryWrites=true&w=majority";
        try (MongoClient mongoClient = MongoClients.create(uri)) {
            MongoDatabase database = mongoClient.getDatabase("${database}");
            MongoCollection<Document> collection = database.getCollection("${collection}");
            
            Document filter = Document.parse("${filterObj.replace(/"/g, '\\"')}");
            for (Document doc : collection.find(filter)) {
                System.out.println(doc.toJson());
            }
        }
    }
} `,

    csharp: `using MongoDB.Bson;
using MongoDB.Driver;

var client = new MongoClient("mongodb+srv://<db_username>:<db_password>@overview.example.mongodb.net/?retryWrites=true&w=majority");
var database = client.GetDatabase("${database}");
var collection = database.GetCollection<BsonDocument>("${collection}");

var filter = BsonDocument.Parse(@"${filterObj.replace(/"/g, '""')}");
var docs = await collection.Find(filter).ToListAsync();`,

    mongosh: `// Connect with mongosh
use ${database}

db.${collection}.find(
  ${filterObj}
)`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0b1a24] rounded-lg shadow-2xl border border-[#d8ece2] dark:border-[#1c2d38] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8edeb] dark:border-[#1c2d38]">
          <div>
            <h3 className="text-base font-semibold text-[#1c2d38] dark:text-[#e8edeb]">Export Query to Language</h3>
            <p className="text-xs text-[#5c768d] dark:text-[#8899a6] mt-0.5">
              Copy query driver syntax for your application code
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white rounded-md hover:bg-[#edf2ef] dark:hover:bg-[#132733] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#edf2ef] dark:border-[#1c2d38] bg-[#fbfdfc] dark:bg-[#07131d] overflow-x-auto">
          {[
            { id: 'python', label: 'Python (3.x)' },
            { id: 'node', label: 'Node.js' },
            { id: 'java', label: 'Java (2.x)' },
            { id: 'csharp', label: 'C# (.NET)' },
            { id: 'mongosh', label: 'mongosh' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveLang(tab.id as any)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeLang === tab.id
                  ? 'border-[#0062d2] dark:border-[#38bdf8] text-[#0062d2] dark:text-[#38bdf8] font-semibold'
                  : 'border-transparent text-[#5c768d] dark:text-[#8899a6] hover:text-[#1c2d38] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 flex-1 overflow-auto bg-white dark:bg-[#0b1a24] text-[#1c2d38] dark:text-[#e8edeb]">
          <pre className="font-mono text-xs leading-relaxed overflow-x-auto p-4 bg-[#f8faf9] dark:bg-[#07131d] border border-[#d8e2dc] dark:border-[#21313c] rounded-md text-[#1c2d38] dark:text-[#e8edeb]">
            {snippets[activeLang]}
          </pre>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-[#f9fbfa] dark:bg-[#07131d] border-t border-[#e8edeb] dark:border-[#1c2d38]">
          <span className="text-xs text-[#8899a6]">
            Includes connection string placeholder and query filter
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#001e2b] dark:bg-[#0062d2] hover:bg-[#112734] dark:hover:bg-[#0051b3] rounded-md transition-colors shadow-xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
