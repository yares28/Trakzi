# Script to update statement-review-dialog.tsx with side panel functionality

$filePath = "c:\Users\Yaya\Desktop\PROJECTS\folio2\components\statement-review-dialog.tsx"
$content = Get-Content $filePath -Raw

# Update Review Queue button
$content = $content -replace `
    'variant=\{showReviewOnly \? "default" : "outline"\}',`
    'variant={sidePanelView === ''review'' ? "default" : "outline"}'

$content = $content -replace `
    'onClick=\{\(\) => setShowReviewOnly\(!showReviewOnly\)\}',`
    'onClick={() => setSidePanelView(sidePanelView === ''review'' ? null : ''review'')}'

$content = $content -replace `
    'disabled=\{reviewMeta\.count === 0 && !showReviewOnly\}',`
    'disabled={reviewMeta.count === 0}'

# Add Group View button after Review Queue button
$reviewQueueButton = @'
                                </Button>
                                <Button
'@

$groupViewButton = @'
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={sidePanelView === 'groups' ? "default" : "outline"}
                                    onClick={() => setSidePanelView(sidePanelView === 'groups' ? null : 'groups')}
                                    disabled={groupsWithMetadata.length === 0}
                                >
                                    Group View ({groupsWithMetadata.length})
                                </Button>
                                <Button
'@

# Find the position after Review Queue button and before Delete button
$pattern = '(\{reviewQueueLabel\}\r?\n\s+</Button>\r?\n\s+<Button\r?\n\s+variant="destructive")'
$replacement = "{reviewQueueLabel}`r`n                                </Button>`r`n                                <Button`r`n                                    type=`"button`"`r`n                                    size=`"sm`"`r`n                                    variant={sidePanelView === 'groups' ? `"default`" : `"outline`"}`r`n                                    onClick={() => setSidePanelView(sidePanelView === 'groups' ? null : 'groups')}`r`n                                    disabled={groupsWithMetadata.length === 0}`r`n                                >`r`n                                    Group View ({groupsWithMetadata.length})`r`n                                </Button>`r`n                                <Button`r`n                                    variant=`"destructive`""

$content = $content -replace $pattern, $replacement

# Save the file
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Updated statement-review-dialog.tsx successfully"
