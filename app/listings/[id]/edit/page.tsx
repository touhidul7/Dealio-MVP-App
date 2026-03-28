import { notFound, redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { refreshMatchesForListing } from '@/lib/match-jobs';

function parseArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function EditListingPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { shares: true }
  });
  if (!listing) notFound();

  const canEdit = user.role === 'admin' || listing.ownerUserId === user.id;
  if (!canEdit) redirect('/listings');

  const advisors = await prisma.user.findMany({
    where: { role: 'advisor', activeStatus: true },
    orderBy: { firstName: 'asc' }
  });

  async function updateListing(formData: FormData) {
    'use server';
    const currentUser = await requireUser();
    const target = await prisma.listing.findUnique({ where: { id } });
    if (!target) redirect('/listings?toast=error&message=Listing%20not%20found');
    const allowed = currentUser.role === 'admin' || target.ownerUserId === currentUser.id;
    if (!allowed) redirect('/listings?toast=error&message=Not%20authorized');

    await prisma.listing.update({
      where: { id },
      data: {
        title: String(formData.get('title') || ''),
        listingType: String(formData.get('listingType') || target.listingType) as any,
        status: String(formData.get('status') || target.status) as any,
        assignedUserId: String(formData.get('assignedUserId') || '') || null,
        industry: String(formData.get('industry') || ''),
        subindustry: String(formData.get('subindustry') || '') || null,
        locationCity: String(formData.get('locationCity') || '') || null,
        locationStateProvince: String(formData.get('locationStateProvince') || '') || null,
        locationCountry: String(formData.get('locationCountry') || '') || null,
        askingPrice: Number(formData.get('askingPrice') || 0) || null,
        revenue: Number(formData.get('revenue') || 0) || null,
        ebitda: Number(formData.get('ebitda') || 0) || null,
        sde: Number(formData.get('sde') || 0) || null,
        employees: Number(formData.get('employees') || 0) || null,
        structureType: String(formData.get('structureType') || '') || null,
        confidentialityLevel: String(formData.get('confidentialityLevel') || '') || null,
        visibilityScope: String(formData.get('visibilityScope') || '') || null,
        targetBuyerTypes: JSON.stringify(
          String(formData.get('targetBuyerTypes') || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        ),
        geographicTags: JSON.stringify(
          String(formData.get('geographicTags') || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        ),
        industryTags: JSON.stringify(
          String(formData.get('industryTags') || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        ),
        businessSummary: String(formData.get('businessSummary') || '') || null,
        advisorNotes: String(formData.get('advisorNotes') || '') || null,
        sourcePlatform: String(formData.get('sourcePlatform') || '') || null,
        sourceUrl: String(formData.get('sourceUrl') || '') || null,
        sourceListingId: String(formData.get('sourceListingId') || '') || null
      }
    });

    const selectedIds = formData.getAll('sharedWithUserIds').map((x) => String(x));
    await prisma.listingShare.deleteMany({ where: { listingId: id } });
    if (selectedIds.length) {
      await prisma.listingShare.createMany({
        data: selectedIds.map((advisorId) => ({ listingId: id, userId: advisorId })),
        skipDuplicates: true
      });
    }

    const updated = await prisma.listing.findUnique({ where: { id } });
    if (updated?.status === 'active') {
      await refreshMatchesForListing(id);
    }
    redirect(`/listings/${id}/edit?toast=success&message=Listing%20updated`);
  }

  async function deleteListing() {
    'use server';
    const currentUser = await requireUser();
    const target = await prisma.listing.findUnique({ where: { id } });
    if (!target) redirect('/listings?toast=error&message=Listing%20not%20found');
    const allowed = currentUser.role === 'admin' || target.ownerUserId === currentUser.id;
    if (!allowed) redirect('/listings?toast=error&message=Not%20authorized');
    await prisma.listing.delete({ where: { id } });
    redirect('/listings?toast=success&message=Listing%20deleted');
  }

  const selectedShares = new Set(listing.shares.map((s) => s.userId));

  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <TopHeader />
        <form action={updateListing} className="card grid grid-2">
          <h1>Edit Listing</h1>
          <input className="input" name="title" placeholder="Title" defaultValue={listing.title} required />
          <select className="select" name="listingType" defaultValue={listing.listingType}>
            <option value="native">Native</option>
            <option value="advisor">Advisor</option>
            <option value="external">External</option>
          </select>
          <select className="select" name="status" defaultValue={listing.status}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="matched">Matched</option>
            <option value="archived">Archived</option>
          </select>
          <select className="select" name="assignedUserId" defaultValue={listing.assignedUserId || ''}>
            <option value="">Unassigned</option>
            {advisors.map((advisor) => (
              <option key={advisor.id} value={advisor.id}>
                {advisor.firstName} {advisor.lastName}
              </option>
            ))}
          </select>
          <input className="input" name="industry" placeholder="Industry" defaultValue={listing.industry} />
          <input className="input" name="subindustry" placeholder="Subindustry" defaultValue={listing.subindustry || ''} />
          <input className="input" name="locationCity" placeholder="City" defaultValue={listing.locationCity || ''} />
          <input className="input" name="locationStateProvince" placeholder="State / Province" defaultValue={listing.locationStateProvince || ''} />
          <input className="input" name="locationCountry" placeholder="Country" defaultValue={listing.locationCountry || ''} />
          <input className="input" name="askingPrice" placeholder="Asking Price" type="number" defaultValue={listing.askingPrice || ''} />
          <input className="input" name="revenue" placeholder="Revenue" type="number" defaultValue={listing.revenue || ''} />
          <input className="input" name="ebitda" placeholder="EBITDA" type="number" defaultValue={listing.ebitda || ''} />
          <input className="input" name="sde" placeholder="SDE" type="number" defaultValue={listing.sde || ''} />
          <input className="input" name="employees" placeholder="Employees" type="number" defaultValue={listing.employees || ''} />
          <input className="input" name="structureType" placeholder="Structure Type" defaultValue={listing.structureType || ''} />
          <input className="input" name="targetBuyerTypes" placeholder="Target buyer types comma separated" defaultValue={parseArray(listing.targetBuyerTypes).join(', ')} />
          <input className="input" name="geographicTags" placeholder="Geographic tags comma separated" defaultValue={parseArray(listing.geographicTags).join(', ')} />
          <input className="input" name="industryTags" placeholder="Industry tags comma separated" defaultValue={parseArray(listing.industryTags).join(', ')} />
          <input className="input" name="confidentialityLevel" placeholder="Confidentiality level" defaultValue={listing.confidentialityLevel || ''} />
          <select className="select" name="visibilityScope" defaultValue={listing.visibilityScope || 'private'}>
            <option value="private">private</option>
            <option value="shared">shared</option>
          </select>
          <input className="input" name="sourcePlatform" placeholder="Source platform" defaultValue={listing.sourcePlatform || ''} />
          <input className="input" name="sourceUrl" placeholder="Source URL" defaultValue={listing.sourceUrl || ''} />
          <input className="input" name="sourceListingId" placeholder="Source listing ID" defaultValue={listing.sourceListingId || ''} />
          <textarea className="textarea" name="businessSummary" placeholder="Business summary" defaultValue={listing.businessSummary || ''} />
          <textarea className="textarea" name="advisorNotes" placeholder="Advisor notes" defaultValue={listing.advisorNotes || ''} />
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Share With Advisors</h3>
            <div className="grid grid-3">
              {advisors.map((advisor) => (
                <label key={advisor.id} className="row">
                  <input
                    type="checkbox"
                    name="sharedWithUserIds"
                    value={advisor.id}
                    defaultChecked={selectedShares.has(advisor.id)}
                  />
                  <span>{advisor.firstName} {advisor.lastName}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="row" style={{ gridColumn: '1 / -1' }}>
            <button className="button" type="submit">Save Changes</button>
          </div>
        </form>
        <form action={deleteListing} className="card" style={{ marginTop: 16 }}>
          <button className="button secondary" type="submit">Delete Listing</button>
        </form>
      </main>
    </div>
  );
}
