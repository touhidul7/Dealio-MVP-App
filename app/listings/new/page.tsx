import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { requireUser } from '@/lib/auth';
import { refreshMatchesForListing } from '@/lib/match-jobs';

export default async function NewListingPage() {
  const user = await requireUser();
  const advisors = await prisma.user.findMany({
    where: user.role === 'admin' ? { role: 'advisor', activeStatus: true } : { id: user.id },
    orderBy: { firstName: 'asc' }
  });

  async function createListing(formData: FormData) {
    'use server';
    const currentUser = await requireUser();
    const assignedUserId = String(formData.get('assignedUserId') || '') || null;
    const targetBuyerTypes = String(formData.get('targetBuyerTypes') || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const sharedWithUserIds = formData.getAll('sharedWithUserIds').map((x) => String(x)).filter(Boolean);
    const listing = await prisma.listing.create({
      data: {
        title: String(formData.get('title') || ''),
        listingType: String(formData.get('listingType') || 'native') as any,
        status: String(formData.get('status') || 'draft') as any,
        ownerUserId: currentUser.role === 'admin' ? String(formData.get('ownerUserId') || currentUser.id) : currentUser.id,
        assignedUserId: assignedUserId || null,
        industry: String(formData.get('industry') || ''),
        subindustry: String(formData.get('subindustry') || '') || null,
        locationCity: String(formData.get('locationCity') || '') || null,
        locationCountry: String(formData.get('locationCountry') || '') || null,
        locationStateProvince: String(formData.get('locationStateProvince') || '') || null,
        askingPrice: Number(formData.get('askingPrice') || 0) || null,
        revenue: Number(formData.get('revenue') || 0) || null,
        ebitda: Number(formData.get('ebitda') || 0) || null,
        sde: Number(formData.get('sde') || 0) || null,
        employees: Number(formData.get('employees') || 0) || null,
        structureType: String(formData.get('structureType') || '') || null,
        targetBuyerTypes: JSON.stringify(targetBuyerTypes),
        geographicTags: JSON.stringify(String(formData.get('geographicTags') || '').split(',').map((x) => x.trim()).filter(Boolean)),
        industryTags: JSON.stringify(String(formData.get('industryTags') || '').split(',').map((x) => x.trim()).filter(Boolean)),
        businessSummary: String(formData.get('businessSummary') || '') || null,
        confidentialityLevel: String(formData.get('confidentialityLevel') || '') || null,
        visibilityScope: String(formData.get('visibilityScope') || '') || null,
        sourcePlatform: String(formData.get('sourcePlatform') || '') || null,
        sourceUrl: String(formData.get('sourceUrl') || '') || null,
        sourceListingId: String(formData.get('sourceListingId') || '') || null,
        advisorNotes: String(formData.get('advisorNotes') || '') || null
      }
    });
    if (sharedWithUserIds.length) {
      await prisma.listingShare.createMany({
        data: sharedWithUserIds.map((advisorId) => ({ listingId: listing.id, userId: advisorId })),
        skipDuplicates: true
      });
    }
    if (listing.status === 'active') {
      await refreshMatchesForListing(listing.id);
    }
    redirect('/dashboard?toast=success&message=Listing%20created');
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <TopHeader />
        <div className="card">
          <h1>New Listing</h1>
          <form action={createListing} className="grid grid-2">
            <input className="input" name="title" placeholder="Title" required />
            {user.role === 'admin' ? (
              <select className="select" name="ownerUserId" defaultValue={user.id}>
                <option value={user.id}>Dealio Admin</option>
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.firstName} {advisor.lastName}
                  </option>
                ))}
              </select>
            ) : null}
            <select className="select" name="listingType" defaultValue="native">
              <option value="native">Native</option><option value="advisor">Advisor</option><option value="external">External</option>
            </select>
            <select className="select" name="status" defaultValue="draft">
              <option value="draft">Draft</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="matched">Matched</option><option value="archived">Archived</option>
            </select>
            <select className="select" name="assignedUserId" defaultValue={user.role === 'advisor' ? user.id : ''}>
              <option value="">Unassigned</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.firstName} {advisor.lastName}
                </option>
              ))}
            </select>
            <input className="input" name="industry" placeholder="Industry" required />
            <input className="input" name="subindustry" placeholder="Subindustry" />
            <input className="input" name="locationCity" placeholder="City" />
            <input className="input" name="locationCountry" placeholder="Country" />
            <input className="input" name="locationStateProvince" placeholder="State / Province" />
            <input className="input" name="askingPrice" placeholder="Asking Price" type="number" />
            <input className="input" name="revenue" placeholder="Revenue" type="number" />
            <input className="input" name="ebitda" placeholder="EBITDA" type="number" />
            <input className="input" name="sde" placeholder="SDE" type="number" />
            <input className="input" name="employees" placeholder="Employees" type="number" />
            <input className="input" name="structureType" placeholder="Structure Type" />
            <input className="input" name="targetBuyerTypes" placeholder="target buyer types comma separated" />
            <input className="input" name="geographicTags" placeholder="geographic tags comma separated" />
            <input className="input" name="industryTags" placeholder="industry tags comma separated" />
            <input className="input" name="confidentialityLevel" placeholder="Confidentiality Level" />
            <input className="input" name="visibilityScope" placeholder="Visibility Scope (private/shared)" />
            <input className="input" name="sourcePlatform" placeholder="Source Platform (external only)" />
            <input className="input" name="sourceUrl" placeholder="Source URL (external only)" />
            <input className="input" name="sourceListingId" placeholder="Source Listing ID (external only)" />
            <textarea className="textarea" name="businessSummary" placeholder="Business summary" />
            <textarea className="textarea" name="advisorNotes" placeholder="Advisor notes" />
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3>Share With Advisors</h3>
              <div className="grid grid-3">
                {advisors.map((advisor) => (
                  <label key={advisor.id} className="row">
                    <input type="checkbox" name="sharedWithUserIds" value={advisor.id} />
                    <span>{advisor.firstName} {advisor.lastName}</span>
                  </label>
                ))}
              </div>
            </div>
            <div><button className="button" type="submit">Create Listing</button></div>
          </form>
        </div>
      </main>
    </div>
  );
}
