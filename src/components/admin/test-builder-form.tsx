"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { convertToWebP } from "@/lib/image-utils";
import { broadcastTestsChanged } from "@/lib/live-updates";
import { adminSubjectOptions, getSubjectLabel, type AdminSubjectCategory } from "@/lib/subject-categories";

type ChapterSummary = {
  subject: string;
  chapter: string;
};

type CustomRow = {
  subject: string;
  chapter: string;
  count: number;
};

type NeetRow = {
  subject: string;
  sectionA: number;
  sectionB: number;
};

const defaultCustomRows: CustomRow[] = [
  { subject: "PHYSICS", chapter: "", count: 15 },
  { subject: "CHEMISTRY", chapter: "", count: 15 },
  { subject: "BIOLOGY", chapter: "", count: 15 },
  { subject: "MAJOR_TEST", chapter: "", count: 15 },
];

const defaultNeetRows: NeetRow[] = [
  { subject: "PHYSICS", sectionA: 35, sectionB: 15 },
  { subject: "CHEMISTRY", sectionA: 35, sectionB: 15 },
  { subject: "BIOLOGY", sectionA: 35, sectionB: 15 },
  { subject: "MAJOR_TEST", sectionA: 35, sectionB: 15 },
];

function parseAnswerKey(value: string): string[] {
  return value
    .split(/[,|\s]+/)
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => ["A", "B", "C", "D"].includes(entry));
}

function parseImageFilename(fileName: string) {
  const baseName = fileName.substring(fileName.lastIndexOf("/") + 1);
  const nameWithoutExt = baseName.substring(0, baseName.lastIndexOf(".")) || baseName;
  const match = nameWithoutExt.match(/^q(\d+)_([A-D])(?:_([A-D](?:[-_][A-D])*))?$/i);

  if (!match) {
    return null;
  }

  const questionNumber = Number(match[1]);
  const primaryAnswer = match[2].toUpperCase();
  const extraAnswers = match[3] ? parseAnswerKey(match[3].replaceAll("-", ",").replaceAll("_", ",")) : [];

  return {
    questionNumber,
    correctAnswers: Array.from(new Set([primaryAnswer, ...extraAnswers])),
  };
}

export function TestBuilderForm({ chapters }: { chapters: ChapterSummary[] }) {
  const router = useRouter();
  const [name, setName] = useState("Full NEET Mock 02");
  const [description, setDescription] = useState("Admin-configured mock test.");
  const [durationMinutes, setDurationMinutes] = useState(200);
  const [correctMarks, setCorrectMarks] = useState(4);
  const [incorrectMarks, setIncorrectMarks] = useState(-1);
  const [unansweredMarks, setUnansweredMarks] = useState(0);
  const [mode, setMode] = useState<"NEET_PATTERN" | "CUSTOM">("NEET_PATTERN");
  const [published, setPublished] = useState(true);
  const [assignedSection, setAssignedSection] = useState<AdminSubjectCategory>("MAJOR_TEST");
  const [neetRows, setNeetRows] = useState<NeetRow[]>(defaultNeetRows);
  const [customRows, setCustomRows] = useState<CustomRow[]>(defaultCustomRows);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadName, setUploadName] = useState("Unit Test Upload");
  const [uploadDescription, setUploadDescription] = useState("Questions uploaded while creating this test.");
  const [uploadDurationMinutes, setUploadDurationMinutes] = useState(180);
  const [uploadCorrectMarks, setUploadCorrectMarks] = useState(4);
  const [uploadIncorrectMarks, setUploadIncorrectMarks] = useState(-1);
  const [uploadUnansweredMarks, setUploadUnansweredMarks] = useState(0);
  const [uploadPublished, setUploadPublished] = useState(true);
  const [uploadAssignedSection, setUploadAssignedSection] = useState<AdminSubjectCategory>("PHYSICS");
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfAnswerKey, setPdfAnswerKey] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploadSubmitting, setIsUploadSubmitting] = useState(false);

  const totalQuestions = useMemo(() => {
    if (mode === "NEET_PATTERN") {
      return neetRows.reduce((sum, row) => sum + row.sectionA + row.sectionB, 0);
    }

    return customRows.reduce((sum, row) => sum + row.count, 0);
  }, [customRows, mode, neetRows]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setMessage("Creating test...");

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          durationMinutes,
          correctMarks,
          incorrectMarks,
          unansweredMarks,
          published,
          assignedSection: mode === "NEET_PATTERN" ? "MAJOR_TEST" : assignedSection,
          mode,
          subjectConfigs: mode === "NEET_PATTERN" ? neetRows : undefined,
          questionConfigs: mode === "CUSTOM" ? customRows.filter((row) => row.count > 0) : undefined,
        }),
      });

      const text = await response.text();
      let payload: { error?: string; test?: { name: string } } = {};
      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Creation failed: ${text}`);
        }
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Test creation failed.");
      }

      setMessage(`Created test: ${payload.test?.name ?? name}`);
  broadcastTestsChanged();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUploadSubmit() {
    if (!jsonFile && !zipFile && !pdfFile) {
      setUploadMessage("Add at least one JSON, ZIP, or PDF file.");
      return;
    }

    setIsUploadSubmitting(true);
    setUploadMessage("Initializing storage client...");

    try {
      // 1. Fetch Supabase Configuration
      const configResponse = await fetch("/api/admin/supabase-config");
      const configText = await configResponse.text();
      let config: any = {};
      try {
        config = JSON.parse(configText);
      } catch {
        if (!configResponse.ok) {
          throw new Error(`Failed to load Supabase configuration: ${configText}`);
        }
      }

      if (!configResponse.ok) {
        throw new Error(config.error ?? "Failed to load Supabase configuration from server.");
      }

      const { supabaseUrl, supabaseKey, bucketName } = config;
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);

      const parsedQuestions = [];
      const chapterSlug = uploadName.toLowerCase().replace(/\s+/g, "-");

      // 2. Parse JSON client-side
      if (jsonFile) {
        setUploadMessage("Parsing JSON file...");
        const jsonText = await jsonFile.text();

        if (/^\s*</.test(jsonText)) {
          throw new Error("Selected file contains HTML instead of JSON. Upload the raw JSON file.");
        }

        const jsonContent = JSON.parse(jsonText);
        const normalized = Array.isArray(jsonContent) ? jsonContent : [jsonContent];

        for (const row of normalized) {
          const correctAnswers = row.correctAnswers ?? (row.correctAnswer ? [row.correctAnswer] : []);
          parsedQuestions.push({
            subject: row.subject ?? uploadAssignedSection,
            chapter: row.chapter ?? uploadName,
            type: "TEXT",
            prompt: row.prompt,
            metadata: row.table ? { table: row.table } : null,
            options: row.options,
            imagePath: null,
            correctAnswers,
            answerPolicy: row.answerPolicy ?? (correctAnswers.length > 1 ? "MULTIPLE" : "SINGLE"),
          });
        }
      }

      // 3. Unzip and upload ZIP images client-side
      if (zipFile) {
        setUploadMessage("Extracting ZIP file...");
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(zipFile);

        const imageEntries: { name: string; file: any }[] = [];
        loadedZip.forEach((relativePath, file) => {
          if (!file.dir && !relativePath.startsWith("__MACOSX/") && !relativePath.substring(relativePath.lastIndexOf("/") + 1).startsWith("._") && /\.(png|jpe?g|webp)$/i.test(relativePath)) {
            imageEntries.push({ name: relativePath, file });
          }
        });

        if (imageEntries.length === 0) {
          throw new Error("No valid image question files found in ZIP.");
        }

        let count = 0;
        for (const entry of imageEntries) {
          count++;
          setUploadMessage(`Processing ZIP image ${count} of ${imageEntries.length}...`);

          const parsed = parseImageFilename(entry.name);
          if (!parsed) {
            throw new Error(`Invalid image filename: ${entry.name}. Expected q<number>_<answer>.png`);
          }

          const blob = await entry.file.async("blob");
          const webpBlob = await convertToWebP(blob);
          const storedName = `${crypto.randomUUID()}.webp`;
          const relativePath = `uploads/${uploadAssignedSection.toLowerCase()}/${chapterSlug}/${storedName}`;

          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(relativePath, webpBlob, {
              contentType: "image/webp",
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`ZIP image upload failed: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(relativePath);

          parsedQuestions.push({
            subject: uploadAssignedSection,
            chapter: uploadName,
            type: "IMAGE",
            prompt: null,
            options: null,
            imagePath: publicUrl,
            correctAnswers: parsed.correctAnswers,
            answerPolicy: parsed.correctAnswers.length > 1 ? "MULTIPLE" : "SINGLE",
          });
        }
      }

      // 4. Render PDF to images and upload client-side
      if (pdfFile) {
        setUploadMessage("Loading PDF parser...");
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const numPages = pdfDoc.numPages;
        const suppliedAnswers = pdfAnswerKey ? pdfAnswerKey.split(/[\s,]+/).map((entry) => entry.trim().toUpperCase()) : [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          setUploadMessage(`Rendering PDF page ${pageNum} of ${numPages}...`);
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.6 });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Failed to create browser canvas context.");
          }

          await page.render({ canvas, canvasContext: context, viewport }).promise;

          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
          if (!blob) {
            throw new Error("Failed to render PDF page to WebP Blob.");
          }

          const fileName = `${crypto.randomUUID()}.webp`;
          const relativePath = `uploads/${uploadAssignedSection.toLowerCase()}/${chapterSlug}/pdf-pages/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(relativePath, blob, {
              contentType: "image/webp",
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`PDF page upload failed: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(relativePath);

          const answer = suppliedAnswers[pageNum - 1];

          parsedQuestions.push({
            subject: uploadAssignedSection,
            chapter: uploadName,
            type: "IMAGE",
            prompt: null,
            options: null,
            imagePath: publicUrl,
            correctAnswers: ["A", "B", "C", "D"].includes(answer) ? [answer] : [],
            answerPolicy: "SINGLE",
          });
        }
      }

      setUploadMessage("Creating test in database...");

      // 5. Send lightweight JSON configuration payload
      const response = await fetch("/api/tests/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadName,
          description: uploadDescription,
          durationMinutes: uploadDurationMinutes,
          correctMarks: uploadCorrectMarks,
          incorrectMarks: uploadIncorrectMarks,
          unansweredMarks: uploadUnansweredMarks,
          published: uploadPublished,
          assignedSection: uploadAssignedSection,
          questions: parsedQuestions,
        }),
      });

      const text = await response.text();
      let payload: { error?: string; message?: string; test?: { name: string } } = {};
      try {
        payload = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Upload failed: ${text}`);
        }
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create test from upload.");
      }

      setUploadMessage(payload.message ?? `Created test: ${payload.test?.name ?? uploadName}`);
      setJsonFile(null);
      setZipFile(null);
      setPdfFile(null);
      setPdfAnswerKey("");
  broadcastTestsChanged();
      router.refresh();
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Failed to create test from upload.");
    } finally {
      setIsUploadSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel rounded-[1.2rem] p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Test Name
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Duration (minutes)
            <input type="number" min={5} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Mode
            <select value={mode} onChange={(event) => setMode(event.target.value as "NEET_PATTERN" | "CUSTOM")} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3">
              <option value="NEET_PATTERN">NEET Pattern</option>
              <option value="CUSTOM">Custom Practice</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Student Section
            <select
              value={mode === "NEET_PATTERN" ? "MAJOR_TEST" : assignedSection}
              onChange={(event) => setAssignedSection(event.target.value as AdminSubjectCategory)}
              disabled={mode === "NEET_PATTERN"}
              className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3 disabled:bg-[#f5f0e8] disabled:text-[#8a6a52]"
            >
              {adminSubjectOptions.map((subject) => (
                <option key={subject.value} value={subject.value}>{subject.label}</option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2 xl:col-span-3 flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="md:col-span-2 xl:col-span-3 flex items-center gap-3 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] px-4 py-3 text-sm text-[#6f5d4d]">
            <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="h-4 w-4 accent-[#d7671b]" />
            Publish immediately so students can see this test.
          </label>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Correct Marks
            <input type="number" value={correctMarks} onChange={(event) => setCorrectMarks(Number(event.target.value))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Incorrect Marks
            <input type="number" value={incorrectMarks} onChange={(event) => setIncorrectMarks(Number(event.target.value))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Unanswered Marks
            <input type="number" value={unansweredMarks} onChange={(event) => setUnansweredMarks(Number(event.target.value))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
        </div>
        <div className="mt-5 rounded-[1rem] bg-[#fff7ef] px-4 py-3 text-sm text-[#6d5a49]">
          Total displayed questions: <strong>{totalQuestions}</strong>{mode === "NEET_PATTERN" ? " · evaluated questions target: 180 when configured as 200." : " · all displayed questions are evaluated."}
        </div>
      </section>

      {mode === "NEET_PATTERN" ? (
        <section className="panel rounded-[1.2rem] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-semibold text-[#2f241c]">NEET Subject Sections</h3>
            <button type="button" className="btn-secondary" onClick={() => { setDurationMinutes(200); setCorrectMarks(4); setIncorrectMarks(-1); setUnansweredMarks(0); setNeetRows(defaultNeetRows); }}>
              Reset to official pattern
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            {neetRows.map((row, index) => (
              <div key={row.subject} className="grid gap-4 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4 md:grid-cols-[1fr_1fr_1fr]">
                <div className="font-semibold text-[#2f241c]">{getSubjectLabel(row.subject)}</div>
                <label className="flex flex-col gap-2 text-sm text-[#705e50]">
                  Section A
                  <input type="number" min={0} value={row.sectionA} onChange={(event) => setNeetRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sectionA: Number(event.target.value) } : item))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
                </label>
                <label className="flex flex-col gap-2 text-sm text-[#705e50]">
                  Section B
                  <input type="number" min={0} value={row.sectionB} onChange={(event) => setNeetRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sectionB: Number(event.target.value) } : item))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
                </label>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel rounded-[1.2rem] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-semibold text-[#2f241c]">Custom Question Source Selection</h3>
            <button type="button" className="btn-secondary" onClick={() => setCustomRows((current) => [...current, { subject: "PHYSICS", chapter: "", count: 10 }])}>
              Add Row
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            {customRows.map((row, index) => (
              <div key={`${row.subject}-${index}`} className="grid gap-4 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_90px]">
                <select value={row.subject} onChange={(event) => setCustomRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, subject: event.target.value } : item))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3 text-sm text-[#6f5d4d]">
                  {adminSubjectOptions.map((subject) => (
                    <option key={subject.value} value={subject.value}>{subject.label}</option>
                  ))}
                </select>
                <input list="chapter-list" value={row.chapter} onChange={(event) => setCustomRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, chapter: event.target.value } : item))} placeholder="Any chapter or leave blank" className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
                <input type="number" min={1} value={row.count} onChange={(event) => setCustomRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, count: Number(event.target.value) } : item))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
                <button type="button" className="btn-danger" onClick={() => setCustomRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
              </div>
            ))}
          </div>
          <datalist id="chapter-list">
            {chapters.map((chapter) => (
              <option key={`${chapter.subject}-${chapter.chapter}`} value={chapter.chapter}>{chapter.subject}</option>
            ))}
          </datalist>
        </section>
      )}

      <div className="flex items-center gap-4">
        <button disabled={isSubmitting} type="button" onClick={handleSubmit} className="btn-primary">Create Test</button>
        {message ? <span className="text-sm text-[#6d5a49]">{message}</span> : null}
      </div>

      <section className="panel rounded-[1.2rem] p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-[#2f241c]">Create Test By Upload</h3>
            <p className="mt-2 text-sm leading-6 text-[#6d5a49]">Upload JSON, ZIP, or PDF files to create a student-visible test. For single-subject JSON uploads, the student section is inferred automatically from the question subjects. For mixed-subject imports, the test is grouped under Major Test.</p>
          </div>
          <div className="w-fit rounded-full bg-[#fff7ef] px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[#b46916]">DIRECT IMPORT</div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Test Section
            <select value={uploadAssignedSection} onChange={(event) => setUploadAssignedSection(event.target.value as AdminSubjectCategory)} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3">
              {adminSubjectOptions.map((subject) => (
                <option key={subject.value} value={subject.value}>{subject.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Test Name
            <input value={uploadName} onChange={(event) => setUploadName(event.target.value)} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Duration (minutes)
            <input type="number" min={5} value={uploadDurationMinutes} onChange={(event) => setUploadDurationMinutes(Number(event.target.value))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="md:col-span-2 xl:col-span-3 flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Description
            <textarea value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} rows={3} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Correct Marks
            <input type="number" value={uploadCorrectMarks} onChange={(event) => setUploadCorrectMarks(Number(event.target.value))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Incorrect Marks
            <input type="number" value={uploadIncorrectMarks} onChange={(event) => setUploadIncorrectMarks(Number(event.target.value))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
            Unanswered Marks
            <input type="number" value={uploadUnansweredMarks} onChange={(event) => setUploadUnansweredMarks(Number(event.target.value))} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
          </label>
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] px-4 py-3 text-sm text-[#6f5d4d]">
          <input type="checkbox" checked={uploadPublished} onChange={(event) => setUploadPublished(event.target.checked)} className="h-4 w-4 accent-[#d7671b]" />
          Publish this uploaded test immediately.
        </label>

        <div className="mt-5 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          <div className="min-w-0 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b46916]">JSON</div>
            <p className="mt-2 text-sm leading-6 text-[#6d5a49]">Upload text questions from JSON.</p>
            <label className="mt-4 flex flex-col gap-2 text-sm text-[#6f5d4d]">
              JSON File
              <input type="file" accept="application/json" onChange={(event) => setJsonFile(event.target.files?.[0] ?? null)} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
            </label>
          </div>

          <div className="min-w-0 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b46916]">ZIP</div>
            <p className="mt-2 text-sm leading-6 text-[#6d5a49]">Upload image questions from a ZIP file.</p>
            <label className="mt-4 flex flex-col gap-2 text-sm text-[#6f5d4d]">
              ZIP File
              <input type="file" accept="application/zip,.zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
            </label>
          </div>

          <div className="min-w-0 rounded-[1rem] border border-[#eadbcd] bg-[#fffdfa] p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b46916]">PDF</div>
            <p className="mt-2 text-sm leading-6 text-[#6d5a49]">Upload PDF pages as image questions.</p>
            <div className="mt-4 grid gap-3">
              <label className="flex flex-col gap-2 text-sm text-[#6f5d4d]">
                PDF File
                <input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} className="w-full min-w-0 rounded-lg border border-[#dacdbf] bg-white px-3 py-3" />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[1rem] bg-[#fff7ef] px-4 py-3 text-sm text-[#6d5a49]">
          You can use any one of these uploads or all three together in the same test creation.
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button disabled={isUploadSubmitting} type="button" onClick={handleUploadSubmit} className="btn-primary">Upload And Create Test</button>
          {uploadMessage ? <span className="text-sm text-[#6d5a49]">{uploadMessage}</span> : null}
        </div>
      </section>
    </div>
  );
}
